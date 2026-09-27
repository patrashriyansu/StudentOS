from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
import random
import string
from backend.core.database import get_db
from backend.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user, oauth2_scheme
from backend.users.models import User
from backend.auth.models import OTP, OTPPurpose
from backend.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, GoogleLoginRequest, OTPRequest, OTPVerifyRequest, PasswordResetRequest
from backend.core.config import settings

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = req.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
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
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
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
async def google_login(req: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        import jwt as pyjwt
        payload = pyjwt.decode(req.id_token, options={"verify_signature": False})
        email = payload.get("email")
        name = payload.get("name", "Google User")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid Google token")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(email=email, name=name, role="student", password_hash="", google_id=payload.get("sub"))
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return TokenResponse(
            access_token=create_access_token({"sub": str(user.id), "role": user.role}),
            refresh_token=create_refresh_token({"sub": str(user.id)})
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Google token")

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str = Depends(oauth2_scheme)):
    payload = decode_token(refresh_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await get_current_user(refresh_token)
    return TokenResponse(
        access_token=create_access_token({"sub": user_id, "role": user.role}),
        refresh_token=create_refresh_token({"sub": user_id})
    )

@router.post("/send-otp")
async def send_otp(req: OTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    code = ''.join(random.choices(string.digits, k=6))
    otp = OTP(
        user_id=user.id,
        code=code,
        purpose=OTPPurpose(req.purpose),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp)
    await db.commit()
    return {"message": "OTP sent", "code": code}

@router.post("/verify-otp")
async def verify_otp(req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    result = await db.execute(
        select(OTP).where(
            OTP.user_id == user.id,
            OTP.code == req.code,
            OTP.purpose == OTPPurpose(req.purpose),
            OTP.is_used == False,
            OTP.expires_at > datetime.now(timezone.utc)
        )
    )
    otp = result.scalar_one_or_none()
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    otp.is_used = True
    await db.commit()
    return {"message": "OTP verified"}

@router.post("/reset-password")
async def reset_password(req: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(req.new_password)
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
