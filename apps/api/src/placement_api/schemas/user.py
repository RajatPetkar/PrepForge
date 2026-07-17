import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from placement_api.db.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str | None = None
    full_name: str | None = None
    phone: str | None = None
    college: str | None = None
    degree: str | None = None
    graduation_year: str | None = None
    target_company: str | None = None
    current_cgpa: str | None = None

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: uuid.UUID
    role: UserRole
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
