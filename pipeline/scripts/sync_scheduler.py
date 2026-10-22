"""Run an immediate sync, then repeat daily at a configured UTC hour."""
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.sync_daily import run_daily_sync
from scripts.sync_espn_rosters import run_espn_roster_sync

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


def next_run(now: datetime, hour_utc: int) -> datetime:
    scheduled = now.replace(hour=hour_utc, minute=0, second=0, microsecond=0)
    if scheduled <= now:
        scheduled += timedelta(days=1)
    return scheduled


def run_scheduler():
    hour_utc = int(os.getenv("NBA_SYNC_HOUR_UTC", "9"))
    if not 0 <= hour_utc <= 23:
        raise ValueError("NBA_SYNC_HOUR_UTC must be between 0 and 23")
    retry_minutes = int(os.getenv("NBA_SYNC_RETRY_MINUTES", "60"))
    if retry_minutes <= 0:
        raise ValueError("NBA_SYNC_RETRY_MINUTES must be greater than 0")

    while True:
        failed = False
        try:
            run_espn_roster_sync()
        except Exception:
            logger.exception("ESPN roster sync failed; scheduling a retry")
            failed = True
        try:
            run_daily_sync()
        except Exception:
            logger.exception("NBA stats sync failed; scheduling a retry")
            failed = True

        now = datetime.now(timezone.utc)
        scheduled = next_run(now, hour_utc)
        if failed:
            retry_at = now + timedelta(minutes=retry_minutes)
            if retry_at < scheduled:
                scheduled = retry_at
        delay = max(0, (scheduled - datetime.now(timezone.utc)).total_seconds())
        logger.info(
            "Next NBA data sync scheduled for %s UTC",
            scheduled.isoformat(timespec="minutes"),
        )
        time.sleep(delay)


if __name__ == "__main__":
    run_scheduler()
