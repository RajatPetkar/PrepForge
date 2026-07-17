import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from placement_api.api.deps import CurrentUser, SessionDep
from placement_api.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from placement_api.schemas.auth import Token, TokenPayload
from placement_api.schemas.user import UserCreate, UserRead
from placement_api.services.user import create_user, get_user_by_email, get_user_by_id

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead)
async def register_user(user_in: UserCreate, session: SessionDep):
    user = await get_user_by_email(session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    user = await create_user(session, user_in)
    return user

@router.post("/login", response_model=Token)
async def login_access_token(
    session: SessionDep,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = await get_user_by_email(session, email=form_data.username)
    if not user or not verify_password(form_data.password, str(user.password_hash)):
        raise HTTPException(
            status_code=400, detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "role": user.role}
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: RefreshTokenRequest,
    session: SessionDep
):
    try:
        payload = decode_token(request.refresh_token)
        token_data = TokenPayload(**payload)
    except jwt.PyJWTError as err:
        raise HTTPException(status_code=403, detail="Invalid refresh token") from err
        
    if not token_data.sub:
        raise HTTPException(status_code=403, detail="Invalid refresh token")
        
    user = await get_user_by_id(session, user_id=uuid.UUID(token_data.sub))
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="User not found or inactive")

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "role": user.role}
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: CurrentUser):
    return current_user
