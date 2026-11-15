from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
import asyncio
import secrets
import hmac
from urllib.parse import urlencode
import smtplib
import ssl
from email.message import EmailMessage
import httpx
import jwt as pyjwt
from backend.core.database import get_db
from backend.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user, oauth2_scheme
from backend.users.models import User, OAuthIdentity
from backend.auth.models import OTP, OTPPurpose
from backend.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, GoogleLoginRequest, OTPRequest, OTPVerifyRequest, PasswordResetRequest
from backend.core.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ALLOWED_ISSUERS = frozenset({"accounts.google.com", "https://accounts.google.com"})

def email_delivery_configured() -> bool:
    return all((settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD, settings.SMTP_FROM_EMAIL))


async def send_otp_email(email: str, code: str, purpose: OTPPurpose) -> None:
    if not email_delivery_configured():
        raise RuntimeError("SMTP email delivery is not configured")

    message = EmailMessage()
    message["Subject"] = "Your StudentOS recovery code" if purpose == OTPPurpose.PASSWORD_RESET else "Your StudentOS verification code"
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = email
    message.set_content(
        f"Your StudentOS verification code is {code}. It expires in 10 minutes. "
        "Do not share this code with anyone. If you did not request it, you can ignore this email."
    )

    def deliver() -> None:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_STARTTLS:
                server.starttls(context=ssl.create_default_context())
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)

    await asyncio.to_thread(deliver)



_google_keys_cache: dict | None = None
_google_keys_fetched_at: datetime | None = None


async def get_google_public_keys(force_refresh: bool = False) -> dict:
    """Cache Google's signing keys briefly and refresh when a key rotates."""
    global _google_keys_cache, _google_keys_fetched_at
    now = datetime.now(timezone.utc)
    cache_is_fresh = (
        _google_keys_cache is not None
        and _google_keys_fetched_at is not None
        and (now - _google_keys_fetched_at).total_seconds() < 3600
    )
    if force_refresh or not cache_is_fresh:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(GOOGLE_CERTS_URL)
            response.raise_for_status()
            _google_keys_cache = response.json()
            _google_keys_fetched_at = now
    return _google_keys_cache or {"keys": []}


async def verify_google_id_token(id_token: str, client_id: str) -> dict:
    """Verify Google ID token signature and claims."""
    keys = await get_google_public_keys()
    unverified_header = pyjwt.get_unverified_header(id_token)
    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=400, detail="Invalid token header")
    key_data = next((key for key in keys.get("keys", []) if key.get("kid") == kid), None)
    if not key_data:
        keys = await get_google_public_keys(force_refresh=True)
        key_data = next((key for key in keys.get("keys", []) if key.get("kid") == kid), None)
    if not key_data:
        raise HTTPException(status_code=401, detail="Google signing key could not be verified")
    public_key = pyjwt.algorithms.RSAAlgorithm.from_jwk(key_data)
    try:
        payload = pyjwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=client_id,
            # PyJWT 2.8 expects a single issuer string, not a list. Verify
            # the signature, audience and expiry first, then validate Google's two
            # documented issuer representations explicitly below.
            options={"verify_iss": False},
        )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=400, detail=f"Invalid token: {e}")
    if payload.get("iss") not in GOOGLE_ALLOWED_ISSUERS:
        raise HTTPException(status_code=400, detail="Invalid token: Invalid issuer")
    return payload


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = req.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=email,
        password_hash=hash_password(req.password),
        name=req.name.strip(),
        role=req.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)})
    )

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, req: LoginRequest, db: AsyncSession = Depends(get_db)):
    email = req.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)})
    )

@router.post("/google", response_model=TokenResponse)
@limiter.limit("5/minute")
async def google_login(request: Request, req: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login is not configured on the StudentOS backend.")

    try:
        payload = await verify_google_id_token(req.id_token, settings.GOOGLE_CLIENT_ID)
        email = str(payload.get("email") or "").strip().lower()
        name = str(payload.get("name") or "Google User").strip()
        google_sub = payload.get("sub")
        email_verified = payload.get("email_verified") is True or payload.get("email_verified") == "true"

        if not email or not google_sub or not email_verified:
            raise HTTPException(status_code=401, detail="Google must verify the email address before sign-in.")
        
        identity_result = await db.execute(select(User).where(User.google_id == google_sub))
        user = identity_result.scalar_one_or_none()
        if user and user.email.lower() != email:
            raise HTTPException(status_code=401, detail="This Google account no longer matches its linked StudentOS email.")

        if not user:
            email_result = await db.execute(
                select(User).where(func.lower(User.email) == email)
            )
            user = email_result.scalar_one_or_none()

        if user and not user.is_active:
            raise HTTPException(status_code=403, detail="This StudentOS account is disabled.")

        if user and user.google_id and user.google_id != google_sub:
            raise HTTPException(status_code=409, detail="This email is already linked to a different Google account.")

        if not user:
            user = User(
                email=email,
                name=name or "Google User",
                role="student",
                password_hash="",
                google_id=google_sub,
                avatar=payload.get("picture"),
                is_verified=True,
            )
            db.add(user)
        else:
            # A verified Google email may securely link an existing password account.
            user.google_id = google_sub
            user.is_verified = True
            if not user.avatar and payload.get("picture"):
                user.avatar = payload["picture"]

        user.last_login = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        return TokenResponse(
            access_token=create_access_token({"sub": str(user.id), "role": user.role}),
            refresh_token=create_refresh_token({"sub": str(user.id)}),
        )
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Google sign-in could not be completed. Please try again.") from exc



def _oauth_state(provider: str) -> str:
    nonce = secrets.token_urlsafe(32)
    return pyjwt.encode(
        {
            "provider": provider,
            "nonce": nonce,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _validate_oauth_state(provider: str, state: str | None, cookie_state: str | None) -> dict:
    if not state or not cookie_state or not hmac.compare_digest(state, cookie_state):
        raise HTTPException(status_code=400, detail="OAuth state validation failed")
    try:
        payload = pyjwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(status_code=400, detail="OAuth state is invalid or expired") from exc
    if payload.get("provider") != provider or not payload.get("nonce"):
        raise HTTPException(status_code=400, detail="OAuth state does not match this provider")
    return payload


def _oauth_callback_url(request: Request, provider: str) -> str:
    return str(request.url_for(f"{provider}_callback"))


def _oauth_finish(*, access_token: str | None = None, refresh_token: str | None = None, error: str | None = None) -> RedirectResponse:
    frontend = (settings.FRONTEND_URL.split(",")[0].strip() or "http://localhost:5173").rstrip("/")
    values = {}
    if access_token and refresh_token:
        values = {"access_token": access_token, "refresh_token": refresh_token}
    elif error:
        values = {"error": error}
    response = RedirectResponse(f"{frontend}/auth/callback#{urlencode(values)}", status_code=302)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


def _clear_oauth_cookie(response: RedirectResponse, provider: str) -> RedirectResponse:
    response.delete_cookie(
        key=f"studentos_oauth_state_{provider}",
        path=f"/api/v1/auth/{provider}",
        secure=True,
        httponly=True,
        samesite="lax",
    )
    return response


async def _complete_oauth_login(
    *,
    provider: str,
    provider_user_id: str,
    email: str,
    name: str,
    avatar: str | None,
    db: AsyncSession,
) -> TokenResponse:
    normalized_email = email.strip().lower()
    if not normalized_email or "@" not in normalized_email or not provider_user_id:
        raise HTTPException(status_code=401, detail="The identity provider did not return a verified email address.")

    identity_result = await db.execute(
        select(OAuthIdentity).where(
            OAuthIdentity.provider == provider,
            OAuthIdentity.provider_user_id == provider_user_id,
        )
    )
    identity = identity_result.scalar_one_or_none()
    user = await db.get(User, identity.user_id) if identity else None

    if not user:
        email_result = await db.execute(
            select(User).where(func.lower(User.email) == normalized_email)
        )
        user = email_result.scalar_one_or_none()

    if user and user.is_active is False:
        raise HTTPException(status_code=403, detail="This StudentOS account is disabled.")

    if not identity:
        if user:
            linked_result = await db.execute(
                select(OAuthIdentity).where(
                    OAuthIdentity.provider == provider,
                    OAuthIdentity.user_id == user.id,
                )
            )
            linked_identity = linked_result.scalar_one_or_none()
            if linked_identity and linked_identity.provider_user_id != provider_user_id:
                raise HTTPException(
                    status_code=409,
                    detail=f"This StudentOS account is already linked to a different {provider.title()} account.",
                )
        else:
            user = User(
                email=normalized_email,
                name=(name or normalized_email.split("@")[0]).strip()[:255],
                role="student",
                password_hash="",
                avatar=avatar,
                is_verified=True,
            )
            db.add(user)
            await db.flush()

        identity = OAuthIdentity(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
        )
        db.add(identity)
    elif not user:
        raise HTTPException(status_code=401, detail="The linked StudentOS account could not be found.")

    if user.email.lower() != normalized_email:
        raise HTTPException(status_code=409, detail="The provider account email no longer matches the linked StudentOS account.")
    user.is_verified = True
    user.last_login = datetime.now(timezone.utc)
    if not user.avatar and avatar:
        user.avatar = avatar

    await db.commit()
    await db.refresh(user)
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.get("/providers")
async def get_login_providers():
    return {
        "google": bool(settings.GOOGLE_CLIENT_ID),
        "github": bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET),
        "microsoft": bool(settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET),
    }


@router.get("/github/authorize", name="github_authorize")
async def github_authorize(request: Request):
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="GitHub sign-in is not configured yet.")
    callback_url = _oauth_callback_url(request, "github")
    state = _oauth_state("github")
    auth_url = "https://github.com/login/oauth/authorize?" + urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": callback_url,
        "scope": "read:user user:email",
        "state": state,
    })
    response = RedirectResponse(auth_url, status_code=302)
    response.set_cookie(
        key="studentos_oauth_state_github",
        value=state,
        max_age=600,
        path="/api/v1/auth/github",
        secure=request.url.scheme == "https",
        httponly=True,
        samesite="lax",
    )
    return response


@router.get("/github/callback", name="github_callback")
async def github_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    response: RedirectResponse
    try:
        state_payload = _validate_oauth_state(
            "github", state, request.cookies.get("studentos_oauth_state_github")
        )
        if error or not code:
            raise HTTPException(status_code=400, detail="GitHub sign-in was cancelled or denied.")

        callback_url = _oauth_callback_url(request, "github")
        async with httpx.AsyncClient(timeout=15) as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": callback_url,
                    "state": state,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            github_access_token = token_data.get("access_token")
            if not github_access_token:
                raise HTTPException(status_code=401, detail="GitHub did not issue an access token.")

            headers = {
                "Authorization": f"Bearer {github_access_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "StudentOS",
            }
            profile_response = await client.get("https://api.github.com/user", headers=headers)
            profile_response.raise_for_status()
            profile = profile_response.json()
            emails_response = await client.get("https://api.github.com/user/emails", headers=headers)
            emails_response.raise_for_status()
            emails = emails_response.json()

        primary_email = next(
            (
                item.get("email")
                for item in emails
                if item.get("primary") is True and item.get("verified") is True
            ),
            None,
        )
        if not primary_email:
            raise HTTPException(
                status_code=401,
                detail="Add and verify a primary email address in GitHub before signing in to StudentOS.",
            )

        tokens = await _complete_oauth_login(
            provider="github",
            provider_user_id=str(profile.get("id") or ""),
            email=primary_email,
            name=profile.get("name") or profile.get("login") or primary_email.split("@")[0],
            avatar=profile.get("avatar_url"),
            db=db,
        )
        response = _oauth_finish(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
        )
    except HTTPException as exc:
        await db.rollback()
        response = _oauth_finish(error=exc.detail)
    except Exception:
        await db.rollback()
        response = _oauth_finish(error="GitHub sign-in could not be completed. Please try again.")
    return _clear_oauth_cookie(response, "github")


@router.get("/microsoft/authorize", name="microsoft_authorize")
async def microsoft_authorize(request: Request):
    if not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Microsoft sign-in is not configured yet.")
    tenant = settings.MICROSOFT_TENANT_ID or "common"
    callback_url = _oauth_callback_url(request, "microsoft")
    state = _oauth_state("microsoft")
    auth_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?" + urlencode({
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": callback_url,
        "response_mode": "query",
        "scope": "openid profile email User.Read",
        "state": state,
        "nonce": pyjwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])["nonce"],
        "prompt": "select_account",
    })
    response = RedirectResponse(auth_url, status_code=302)
    response.set_cookie(
        key="studentos_oauth_state_microsoft",
        value=state,
        max_age=600,
        path="/api/v1/auth/microsoft",
        secure=request.url.scheme == "https",
        httponly=True,
        samesite="lax",
    )
    return response


async def _verify_microsoft_id_token(id_token: str, expected_nonce: str) -> dict:
    try:
        header = pyjwt.get_unverified_header(id_token)
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Microsoft returned an invalid identity token.") from exc
    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Microsoft identity token has no signing key.")

    async with httpx.AsyncClient(timeout=15) as client:
        discovery = await client.get(
            "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration"
        )
        discovery.raise_for_status()
        jwks_response = await client.get(discovery.json()["jwks_uri"])
        jwks_response.raise_for_status()
        jwks = jwks_response.json()

    key_data = next((key for key in jwks.get("keys", []) if key.get("kid") == kid), None)
    if not key_data:
        raise HTTPException(status_code=401, detail="Microsoft signing key could not be verified.")
    public_key = pyjwt.algorithms.RSAAlgorithm.from_jwk(key_data)
    try:
        claims = pyjwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.MICROSOFT_CLIENT_ID,
            options={"verify_iss": False},
        )
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Microsoft identity token validation failed.") from exc

    tenant_id = claims.get("tid")
    if not tenant_id or claims.get("iss") != f"https://login.microsoftonline.com/{tenant_id}/v2.0":
        raise HTTPException(status_code=401, detail="Microsoft identity token issuer is invalid.")
    if not hmac.compare_digest(str(claims.get("nonce") or ""), expected_nonce):
        raise HTTPException(status_code=401, detail="Microsoft identity token nonce validation failed.")
    if not claims.get("oid") and not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Microsoft identity token has no user identifier.")
    return claims


@router.get("/microsoft/callback", name="microsoft_callback")
async def microsoft_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    response: RedirectResponse
    try:
        state_payload = _validate_oauth_state(
            "microsoft", state, request.cookies.get("studentos_oauth_state_microsoft")
        )
        if error or not code:
            raise HTTPException(status_code=400, detail="Microsoft sign-in was cancelled or denied.")

        tenant = settings.MICROSOFT_TENANT_ID or "common"
        callback_url = _oauth_callback_url(request, "microsoft")
        async with httpx.AsyncClient(timeout=15) as client:
            token_response = await client.post(
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                data={
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": callback_url,
                    "scope": "openid profile email User.Read",
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            id_token = token_data.get("id_token")
            microsoft_access_token = token_data.get("access_token")
            if not id_token or not microsoft_access_token:
                raise HTTPException(status_code=401, detail="Microsoft did not return the required identity credentials.")

            claims = await _verify_microsoft_id_token(id_token, state_payload["nonce"])
            graph_response = await client.get(
                "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
                headers={"Authorization": f"Bearer {microsoft_access_token}"},
            )
            graph_response.raise_for_status()
            profile = graph_response.json()

        email = profile.get("mail") or claims.get("email") or claims.get("preferred_username")
        if not email:
            raise HTTPException(
                status_code=401,
                detail="Microsoft did not provide an email address for this account.",
            )
        tokens = await _complete_oauth_login(
            provider="microsoft",
            provider_user_id=str(claims.get("oid") or claims.get("sub") or profile.get("id") or ""),
            email=email,
            name=profile.get("displayName") or claims.get("name") or email.split("@")[0],
            avatar=None,
            db=db,
        )
        response = _oauth_finish(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
        )
    except HTTPException as exc:
        await db.rollback()
        response = _oauth_finish(error=exc.detail)
    except Exception:
        await db.rollback()
        response = _oauth_finish(error="Microsoft sign-in could not be completed. Please try again.")
    return _clear_oauth_cookie(response, "microsoft")

@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(request: Request, refresh_token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    payload = decode_token(refresh_token, expected_type="refresh")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    result = await db.execute(select(User).where(User.id == int(user_id), User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return TokenResponse(
        access_token=create_access_token({"sub": user_id, "role": user.role}),
        refresh_token=create_refresh_token({"sub": user_id})
    )

@router.post("/send-otp")
@limiter.limit("3/minute")
async def send_otp(request: Request, req: OTPRequest, db: AsyncSession = Depends(get_db)):
    if not email_delivery_configured():
        raise HTTPException(status_code=503, detail="Password recovery email is not configured. Please contact support.")

    try:
        purpose = OTPPurpose(req.purpose)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid OTP purpose")

    result = await db.execute(select(User).where(func.lower(User.email) == req.email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        # Avoid revealing whether an email address is registered.
        return {"message": "If an account exists, a verification code has been sent."}

    pending_result = await db.execute(
        select(OTP).where(OTP.user_id == user.id, OTP.purpose == purpose, OTP.is_used.is_(False))
    )
    for previous in pending_result.scalars().all():
        previous.is_used = True

    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = OTP(
        user_id=user.id,
        code=code,
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(otp)
    await db.commit()

    try:
        await send_otp_email(user.email, code, purpose)
    except Exception:
        otp.is_used = True
        await db.commit()
        raise HTTPException(status_code=503, detail="We could not send the recovery email. Please try again later.")

    return {"message": "If an account exists, a verification code has been sent."}


@router.post("/verify-otp")
@limiter.limit("5/minute")
async def verify_otp(request: Request, req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    try:
        purpose = OTPPurpose(req.purpose)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid OTP purpose")

    result = await db.execute(select(User).where(func.lower(User.email) == req.email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    result = await db.execute(
        select(OTP).where(
            OTP.user_id == user.id,
            OTP.code == req.code,
            OTP.purpose == purpose,
            OTP.is_used.is_(False),
            OTP.expires_at > datetime.now(timezone.utc),
        ).order_by(OTP.created_at.desc()).limit(1)
    )
    otp = result.scalar_one_or_none()
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Password-reset verification is intentionally non-consuming. The reset
    # endpoint consumes the same code after the new password is stored.
    if purpose != OTPPurpose.PASSWORD_RESET:
        otp.is_used = True
        await db.commit()
    return {"message": "OTP verified"}


@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(request: Request, req: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(func.lower(User.email) == req.email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    result = await db.execute(
        select(OTP).where(
            OTP.user_id == user.id,
            OTP.code == req.code,
            OTP.purpose == OTPPurpose.PASSWORD_RESET,
            OTP.is_used.is_(False),
            OTP.expires_at > datetime.now(timezone.utc),
        ).order_by(OTP.created_at.desc()).limit(1)
    )
    otp = result.scalar_one_or_none()
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user.password_hash = hash_password(req.new_password)
    otp.is_used = True
    await db.commit()
    return {"message": "Password reset successful"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "avatar": current_user.avatar,
        "created_at": current_user.created_at.isoformat(),
        "xp_points": getattr(current_user, "xp_points", 0),
        "level": getattr(current_user, "level", 1),
        "streak_days": getattr(current_user, "streak_days", 0),
    }
