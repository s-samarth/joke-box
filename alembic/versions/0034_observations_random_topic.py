"""every observation has a topic: the ones with none go to Random

Observations used to start with no topic ("Not sorted"). Now they always have one, like jokes:
the API files a save without a topic under Random, and this moves the ones already without one
there too. The column stays nullable, so the deployment still serving during the build, which
can still save one without a topic, keeps working; the API fills it in on its next save.

Revision ID: 0034
Revises: 0033
Create Date: 2026-11-07 18:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0034"
down_revision: str | Sequence[str] | None = "0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE observations SET joke_topic_id = (
            SELECT topics.id FROM topics
            WHERE topics.user_id = observations.user_id AND topics.is_system
        )
        WHERE joke_topic_id IS NULL
        """
    )


def downgrade() -> None:
    """Nothing to undo: which ones had no topic isn't kept, and Random is a fine home for them."""
