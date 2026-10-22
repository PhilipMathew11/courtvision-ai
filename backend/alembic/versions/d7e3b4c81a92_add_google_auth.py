"""Support linking Google identities to user accounts.

Revision ID: d7e3b4c81a92
Revises: c6d28a71f4b1
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7e3b4c81a92"
down_revision: Union[str, Sequence[str], None] = "c6d28a71f4b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )
    op.add_column("users", sa.Column("google_sub", sa.String(length=255), nullable=True))
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_column("users", "google_sub")
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )
