from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

ALLOWED_ROLES = {"student", "recruiter", "mentor"}  # Faculty/admin accounts are granted by an administrator.

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    name: str = Field(..., min_length=1, max_length=255)
    role: str = "student"
    registration_number: str | None = Field(default=None, min_length=2, max_length=50)
    section: str | None = Field(default=None, min_length=1, max_length=80)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        name = v.strip()
        if not name:
            raise ValueError('Name is required')
        return name

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        role = v.strip().lower()
        if role not in ALLOWED_ROLES:
            raise ValueError('Invalid role')
        return role

    @model_validator(mode='after')
    def validate_student_identity_pair(self):
        if bool(self.registration_number) != bool(self.section):
            raise ValueError('Registration number and section must be provided together')
        if self.registration_number is not None:
            self.registration_number = self.registration_number.strip().upper()
            if not self.registration_number:
                raise ValueError('Registration number cannot be blank')
        if self.section is not None:
            self.section = self.section.strip().upper()
            if not self.section:
                raise ValueError('Section cannot be blank')
        return self

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class GoogleLoginRequest(BaseModel):
    id_token: str

class OTPRequest(BaseModel):
    email: EmailStr
    purpose: Literal["email_verification", "password_reset"]

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., pattern=r"^\d{6}$")
    purpose: Literal["email_verification", "password_reset"]

class PasswordResetRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v
