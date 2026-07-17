import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from placement_api.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from placement_api.models.user import User


class MockInterview(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "mock_interviews"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    interview_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_company: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="active", nullable=False)
    score: Mapped[float | None] = mapped_column(Float)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", default=dict, nullable=False)

    user: Mapped["User"] = relationship(back_populates="mock_interviews")
    turns: Mapped[list["MockInterviewTurn"]] = relationship(
        back_populates="mock_interview",
        cascade="all, delete-orphan",
    )


class MockInterviewTurn(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "mock_interview_turns"
    __table_args__ = (
        UniqueConstraint("mock_interview_id", "turn_index", name="uq_mock_turn_interview_index"),
    )

    mock_interview_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mock_interviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text)
    evaluation: Mapped[dict[str, Any]] = mapped_column(default=dict, nullable=False)

    mock_interview: Mapped["MockInterview"] = relationship(back_populates="turns")
