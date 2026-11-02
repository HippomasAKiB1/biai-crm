from __future__ import annotations

from datetime import datetime, timedelta
import re


def parse_callback_hint(message: str, received_at: datetime) -> datetime | None:
    """
    Detects callback phrases. Returns naive datetime in the received_at
    timezone, or None if no clear hint.
    """
    if not message:
        return None

    try:
        text = message.lower()
        base_date = received_at.replace(second=0, microsecond=0)

        # 1. Detect relative day offset
        day_offset: int | None = None
        if "day after tomorrow" in text or "poroshu" in text or "পরশু" in text:
            day_offset = 2
        elif (
            re.search(r"\btomorrow\b", text)
            or re.search(r"\bkalke?\b", text)
            or re.search(r"\bকাল\b", text)
        ):
            day_offset = 1
        elif (
            re.search(r"\btoday\b", text)
            or re.search(r"\bআজ\b", text)
            or re.search(r"\bajke?\b", text)
        ):
            day_offset = 0

        # 2. Detect explicit time patterns
        # e.g. "after 5 PM", "at 5:30 pm", "around 5", "5 pm", "5:30 am", etc.
        time_match = re.search(
            r"(?:after|at|around|por|e)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", text
        )
        if not time_match:
            time_match = re.search(
                r"(?:after|at|around)\s+(\d{1,2})(?::(\d{2}))?\b", text
            )

        hour: int | None = None
        minute: int = 0

        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2)) if time_match.group(2) else 0
            meridiem = (
                time_match.group(3).lower()
                if len(time_match.groups()) >= 3 and time_match.group(3)
                else None
            )

            # Hour adjustments
            if meridiem == "pm" and hour < 12:
                hour += 12
            elif meridiem == "am" and hour == 12:
                hour = 0
            elif meridiem is None:
                if 1 <= hour <= 6:
                    hour += 12
                elif 7 <= hour <= 11:
                    pass
                elif 12 <= hour <= 23:
                    pass
        else:
            # Word-based time hints
            if "bikal" in text or "বিকাল" in text or "afternoon" in text:
                hour = 16
                minute = 0
            elif "sokal" in text or "সকাল" in text or "morning" in text:
                hour = 10
                minute = 0

        # AT-9 requirement: Must have an explicit time specification or time-of-day keyword
        if hour is None:
            return None

        # If time is known but no day specified, default to today
        if day_offset is None:
            day_offset = 0

        target_date = base_date.date() + timedelta(days=day_offset)
        result_dt = datetime.combine(target_date, datetime.min.time()).replace(
            hour=hour,
            minute=minute,
            second=0,
            microsecond=0,
        )

        # If today and time has already passed received_at, roll forward 24h
        if day_offset == 0 and result_dt <= base_date:
            result_dt += timedelta(days=1)

        return result_dt
    except Exception:
        return None
