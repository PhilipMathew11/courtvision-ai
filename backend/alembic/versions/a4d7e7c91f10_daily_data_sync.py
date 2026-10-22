"""Add storage used by the daily NBA data sync.

Revision ID: a4d7e7c91f10
Revises: 2bdfe856c1ae
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a4d7e7c91f10"
down_revision: Union[str, Sequence[str], None] = "2bdfe856c1ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    player_columns = {column["name"] for column in inspector.get_columns("players")}
    if "dna_scores" not in player_columns:
        op.add_column(
            "players",
            sa.Column("dna_scores", postgresql.JSONB(astext_type=sa.Text())),
        )
    if "season_stats" not in player_columns:
        op.add_column(
            "players",
            sa.Column("season_stats", postgresql.JSONB(astext_type=sa.Text())),
        )

    tables = set(inspector.get_table_names())
    if "team_season_stats" not in tables:
        op.create_table(
            "team_season_stats",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("team_abbreviation", sa.String(length=10), nullable=False),
            sa.Column("season", sa.String(length=10), nullable=False),
            sa.Column("gp", sa.Integer()),
            sa.Column("wins", sa.Integer()),
            sa.Column("losses", sa.Integer()),
            sa.Column("win_pct", sa.Float()),
            sa.Column("pts", sa.Float()),
            sa.Column("opp_pts", sa.Float()),
            sa.Column("reb", sa.Float()),
            sa.Column("ast", sa.Float()),
            sa.Column("stl", sa.Float()),
            sa.Column("blk", sa.Float()),
            sa.Column("tov", sa.Float()),
            sa.Column("fg_pct", sa.Float()),
            sa.Column("fg3_pct", sa.Float()),
            sa.Column("ft_pct", sa.Float()),
            sa.Column("plus_minus", sa.Float()),
            sa.Column("off_rating", sa.Float()),
            sa.Column("def_rating", sa.Float()),
            sa.Column("pace", sa.Float()),
            sa.Column("ts_pct", sa.Float()),
            sa.Column("extra_data", postgresql.JSONB(astext_type=sa.Text())),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint(
                "team_abbreviation",
                "season",
                name="team_season_stats_team_abbreviation_season_key",
            ),
        )
        op.create_index("ix_team_season_stats_id", "team_season_stats", ["id"])
    elif not any(
        set(constraint["column_names"]) == {"team_abbreviation", "season"}
        for constraint in inspector.get_unique_constraints("team_season_stats")
    ):
        op.create_unique_constraint(
            "team_season_stats_team_abbreviation_season_key",
            "team_season_stats",
            ["team_abbreviation", "season"],
        )
    for column_name in ("created_at", "updated_at"):
        team_columns = {
            column["name"] for column in sa.inspect(op.get_bind()).get_columns("team_season_stats")
        }
        if column_name not in team_columns:
            op.add_column(
                "team_season_stats",
                sa.Column(
                    column_name,
                    sa.DateTime(timezone=True),
                    server_default=sa.text("now()"),
                    nullable=False,
                ),
            )

    if "game_results" not in tables:
        op.create_table(
            "game_results",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("season", sa.String(length=10), nullable=False),
            sa.Column("game_date", sa.Date(), nullable=False),
            sa.Column("home_team", sa.String(length=10), nullable=False),
            sa.Column("away_team", sa.String(length=10), nullable=False),
            sa.Column("home_score", sa.Integer(), nullable=False),
            sa.Column("away_score", sa.Integer(), nullable=False),
            sa.Column("home_win", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint(
                "season",
                "game_date",
                "home_team",
                "away_team",
                name="game_results_season_game_date_home_team_away_team_key",
            ),
        )
        op.create_index("ix_game_results_id", "game_results", ["id"])
    elif not any(
        set(constraint["column_names"])
        == {"season", "game_date", "home_team", "away_team"}
        for constraint in inspector.get_unique_constraints("game_results")
    ):
        op.create_unique_constraint(
            "game_results_season_game_date_home_team_away_team_key",
            "game_results",
            ["season", "game_date", "home_team", "away_team"],
        )
    for column_name in ("created_at", "updated_at"):
        game_columns = {
            column["name"] for column in sa.inspect(op.get_bind()).get_columns("game_results")
        }
        if column_name not in game_columns:
            op.add_column(
                "game_results",
                sa.Column(
                    column_name,
                    sa.DateTime(timezone=True),
                    server_default=sa.text("now()"),
                    nullable=False,
                ),
            )


def downgrade() -> None:
    # Keep synced data and historical database objects intact on downgrade.
    pass
