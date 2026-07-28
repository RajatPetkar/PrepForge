"""cascade_delete_citation_chunk_fk

Revision ID: b01c3d5e7f90
Revises: 4a7eba7c8e2c
Create Date: 2026-07-18 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'b01c3d5e7f90'
down_revision: str | None = '4a7eba7c8e2c'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        'message_citations_chunk_id_fkey',
        'message_citations',
        type_='foreignkey',
    )
    op.create_foreign_key(
        'message_citations_chunk_id_fkey',
        'message_citations',
        'chunks',
        ['chunk_id'],
        ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint(
        'message_citations_chunk_id_fkey',
        'message_citations',
        type_='foreignkey',
    )
    op.create_foreign_key(
        'message_citations_chunk_id_fkey',
        'message_citations',
        'chunks',
        ['chunk_id'],
        ['id'],
        ondelete='RESTRICT',
    )
