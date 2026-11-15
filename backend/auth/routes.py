from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
import asyncio
import secrets
import smtplib
import ssl
from email.message import EmailMessage
import httpx
import jwt as pyjwt
from backend.core.database import get_db
from backend.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user, oauth2_scheme
from backend.users.models import User
from backend.auth.models import OTP, OTPPurpose
from backend.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, GoogleLoginRequest, OTPRequest, OTPVerifyRequest, PasswordResetRequest
from backend.core.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"

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
            issuer=["accounts.google.com", "https://accounts.google.com"],
        )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=400, detail=f"Invalid token: {e}")
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
