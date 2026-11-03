from __future__ import annotations

import csv
import logging
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..db import get_session
from ..llm.client import extract
from ..rules import build_enquiry

logger = logging.getLogger("biai.eval")

router = APIRouter(tags=["eval"])

REPO_ROOT = Path(__file__).resolve().parents[3]
EVAL_LABELS_PATH = REPO_ROOT / "data" / "eval_labels.csv"
HOLDOUT_PATH = REPO_ROOT / "eval" / "holdout.csv"
SAMPLES_PATH = REPO_ROOT / "data" / "sample-enquiries.csv"


def _is_bool_match(a: any, e: any) -> bool:
    ab = bool(a) if not isinstance(a, str) else a.strip().lower() in ("true", "1")
    eb = bool(e) if not isinstance(e, str) else e.strip().lower() in ("true", "1")
    return ab == eb


def _is_str_match(a: any, e: any, field: str) -> bool:
    a_s = str(a).strip().lower() if a is not None else ""
    e_s = str(e).strip().lower() if e is not None else ""
    if field == "interest":
        if e_s in ("none", "null") and a_s in ("none", "null", "unknown"):
            return True
    return a_s == e_s


def _evaluate_rows(items: list[dict]) -> dict:
    """
    items: list of { "id": int, "text": str, "expected": dict }
    Returns { "total": int, "accuracy": dict, "rows": list }
    """
    eval_rows = []
    field_names = ["category", "language", "interest", "priority", "review"]
    field_correct = {f: 0 for f in field_names}
    total_fields = len(items) * len(field_names)
    total_correct = 0

    for item in items:
        row_id = item["id"]
        text = item["text"]
        expected = item["expected"]

        try:
            res, _ = extract(text)
            enq = build_enquiry(res, text)
            actual = {
                "category": enq.category,
                "language": enq.language,
                "interest": enq.interest,
                "priority": enq.priority,
                "review_required": enq.needs_human_review,
            }
        except Exception as e:
            logger.warning("Extraction failed for eval row %s: %s", row_id, e)
            actual = {
                "category": "extraction_failed",
                "language": "extraction_failed",
                "interest": "extraction_failed",
                "priority": "extraction_failed",
                "review_required": False,
            }

        cat_match = _is_str_match(actual["category"], expected.get("category"), "category")
        lang_match = _is_str_match(actual["language"], expected.get("language"), "language")
        int_match = _is_str_match(actual["interest"], expected.get("interest"), "interest")
        prio_match = _is_str_match(actual["priority"], expected.get("priority"), "priority")
        rev_match = _is_bool_match(actual["review_required"], expected.get("review_required"))

        matches = {
            "category": cat_match,
            "language": lang_match,
            "interest": int_match,
            "priority": prio_match,
            "review": rev_match,
        }

        for f in field_names:
            if matches[f]:
                field_correct[f] += 1
                total_correct += 1

        eval_rows.append({
            "id": row_id,
            "text": text,
            "expected": expected,
            "actual": actual,
            "match": matches,
        })

    n = len(items) if len(items) > 0 else 1
    accuracy = {
        "overall": round((total_correct / total_fields) * 100, 1) if total_fields > 0 else 0.0,
        "category": round((field_correct["category"] / n) * 100, 1),
        "language": round((field_correct["language"] / n) * 100, 1),
        "interest": round((field_correct["interest"] / n) * 100, 1),
        "priority": round((field_correct["priority"] / n) * 100, 1),
        "review": round((field_correct["review"] / n) * 100, 1),
    }

    return {
        "total": len(items),
        "accuracy": accuracy,
        "rows": eval_rows,
    }


@router.post("/api/eval/run")
def run_eval(session: Session = Depends(get_session)) -> dict:
    """
    Runs extraction on the 20 samples and 12 holdout messages, compares
    to ground truth, and returns accuracy metrics + mismatch details.
    """
    # 1. Load sample enquiries messages
    sample_messages: dict[int, str] = {}
    with open(SAMPLES_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sample_messages[int(row["id"])] = row["message"]

    # 2. Load eval labels for samples
    sample_items = []
    with open(EVAL_LABELS_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_id = int(row["id"])
            sample_items.append({
                "id": row_id,
                "text": sample_messages.get(row_id, ""),
                "expected": {
                    "category": row.get("category"),
                    "language": row.get("language"),
                    "interest": row.get("interest"),
                    "priority": row.get("priority"),
                    "review_required": row.get("review_required"),
                },
            })

    # 3. Load holdout messages
    holdout_items = []
    with open(HOLDOUT_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_id = int(row["id"])
            holdout_items.append({
                "id": row_id,
                "text": row["message"],
                "expected": {
                    "category": row.get("category"),
                    "language": row.get("language"),
                    "interest": row.get("interest"),
                    "priority": row.get("priority"),
                    "review_required": row.get("review_required"),
                },
            })

    # 4. Evaluate both sets
    samples_eval = _evaluate_rows(sample_items)
    holdout_eval = _evaluate_rows(holdout_items)

    return {
        "samples": samples_eval,
        "holdout": holdout_eval,
    }
