"""Run one idempotent refresh of the current NBA season."""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.sync_daily import run_daily_sync


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", help="Override the automatically detected NBA season")
    args = parser.parse_args()
    run_daily_sync(args.season)