from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "student"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class GoogleLoginRequest(BaseModel):
    id_token: str

class OTPRequest(BaseModel):
    email: EmailStr
    purpose: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: str

class PasswordResetRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str
