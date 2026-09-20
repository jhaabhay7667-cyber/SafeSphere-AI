from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=5000)
    category: str = Field(default="Other", max_length=50)
    severity: str = "Medium"
    location_text: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class IncidentStatusUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=30)


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    severity: str
    location_text: str | None
    latitude: float | None
    longitude: float | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    email: EmailStr | None = None
    relationship_label: str | None = Field(default=None, max_length=50)


class ContactResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: str | None
    relationship_label: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)