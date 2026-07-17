import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from placement_api.core.config import get_settings
from placement_api.core.security import ALGORITHM
from placement_api.db.enums import UserRole
from placement_api.db.session import get_db_session
from placement_api.models.user import User
from placement_api.schemas.auth import TokenPayload
from placement_api.services.user import get_user_by_id

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{get_settings().api_v1_prefix}/auth/login"
)

SessionDep = Annotated[AsyncSession, Depends(get_db_session)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]

async def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        settings = get_settings()
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except jwt.PyJWTError as err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from err
    if not token_data.sub:
        raise HTTPException(status_code=403, detail="Invalid token")
    
    user_id = uuid.UUID(token_data.sub)
    user = await get_user_by_id(session=session, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

async def get_current_admin(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user
