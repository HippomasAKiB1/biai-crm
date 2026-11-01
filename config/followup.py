"""
Follow-up timing thresholds — one file, one place to tune.

Used by the follow-up watchlist and the "Needs follow-up" badge on the board.
Change the numbers here; nothing else needs to be touched.
"""
from datetime import timedelta

URGENT_DUE_HOURS = 2       # urgent leads must be followed up within 2 hours
DEFAULT_DUE_HOURS = 24     # every other open lead gets 24 hours
OVERDUE_BADGE_HOURS = 48   # "Needs follow-up" badge appears after 48 hours

URGENT_DUE = timedelta(hours=URGENT_DUE_HOURS)
DEFAULT_DUE = timedelta(hours=DEFAULT_DUE_HOURS)
OVERDUE_BADGE = timedelta(hours=OVERDUE_BADGE_HOURS)
