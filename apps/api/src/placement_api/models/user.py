from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from placement_api.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from placement_api.db.enums import UserRole

if TYPE_CHECKING:
    from placement_api.models.conversation import Conversation
    from placement_api.models.document import Document
    from placement_api.models.mock_interview import MockInterview
    from placement_api.models.resume import ResumeReport
    from placement_api.models.study_plan import StudyPlan


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(20))
    college: Mapped[str | None] = mapped_column(String(200))
    degree: Mapped[str | None] = mapped_column(String(100))
    graduation_year: Mapped[str | None] = mapped_column(String(10))
    target_company: Mapped[str | None] = mapped_column(String(100))
    current_cgpa: Mapped[str | None] = mapped_column(String(10))
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        default=UserRole.STUDENT,
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    documents: Mapped[list["Document"]] = relationship(back_populates="uploaded_by")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user")
    resume_reports: Mapped[list["ResumeReport"]] = relationship(back_populates="user")
    study_plans: Mapped[list["StudyPlan"]] = relationship(back_populates="user")
    mock_interviews: Mapped[list["MockInterview"]] = relationship(back_populates="user")
