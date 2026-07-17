import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from placement_api.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from placement_api.models.user import User


class StudyPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "study_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_company: Mapped[str | None] = mapped_column(String(160))
    available_days: Mapped[int] = mapped_column(Integer, nullable=False)
    skill_level: Mapped[str] = mapped_column(String(60), nullable=False)
    plan: Mapped[dict[str, Any]] = mapped_column(default=dict, nullable=False)
    progress: Mapped[dict[str, Any]] = mapped_column(default=dict, nullable=False)

    user: Mapped["User"] = relationship(back_populates="study_plans")

