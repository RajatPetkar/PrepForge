import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from placement_api.core.security import get_password_hash
from placement_api.models.user import User
from placement_api.schemas.user import UserCreate


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()

async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()

async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)

async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    username = user_in.username
    if not username:
        username = user_in.email.split("@")[0]
    user = User(
        email=user_in.email,
        username=username,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        college=user_in.college,
        degree=user_in.degree,
        graduation_year=user_in.graduation_year,
        target_company=user_in.target_company,
        current_cgpa=user_in.current_cgpa,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user
