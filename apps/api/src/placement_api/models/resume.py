import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from placement_api.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from placement_api.models.document import Document
    from placement_api.models.user import User


class ResumeReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "resume_reports"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    resume_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
    )
    ats_score: Mapped[float | None] = mapped_column(Float)
    target_company: Mapped[str | None] = mapped_column(String(160))
    report: Mapped[dict[str, Any]] = mapped_column(default=dict, nullable=False)

    user: Mapped["User"] = relationship(back_populates="resume_reports")
    resume_document: Mapped["Document | None"] = relationship(back_populates="resume_reports")

