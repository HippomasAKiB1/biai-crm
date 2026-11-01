from __future__ import annotations

import re

BD_PHONE_REGEX = re.compile(r"\b(?:\+?88)?0?1[3-9]\d{8}\b")


def extract_phone(text: str) -> str | None:
    match = BD_PHONE_REGEX.search(text)
    return match.group(0) if match else None


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 13 and digits.startswith("880"):
        res = digits[2:]
    elif len(digits) == 12 and digits.startswith("88"):
        res = "0" + digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        res = digits
    elif len(digits) == 10 and digits.startswith("1"):
        res = "0" + digits
    else:
        return None

    if len(res) == 11 and re.match(r"^01[3-9]\d{8}$", res):
        return res
    return None
