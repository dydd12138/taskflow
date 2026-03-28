"""add conversations and skills tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('context_type', sa.Text, nullable=False),
        sa.Column('context_id', sa.Text, nullable=False),
        sa.Column('role', sa.Text, nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('tool_calls', sa.Text, nullable=True),
        sa.Column('quoted_message_id', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False,
                  server_default=sa.text("(datetime('now'))")),
    )

    op.create_table(
        'skills',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('trigger', sa.Text, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('prompt', sa.Text, nullable=False),
        sa.Column('enabled', sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False,
                  server_default=sa.text("(datetime('now'))")),
    )


def downgrade() -> None:
    op.drop_table('skills')
    op.drop_table('conversations')
