#!/usr/bin/env python3
"""
Standalone evaluation runner for BIAI CRM.
Executes against POST /api/eval/run, retrying on connection errors or cold starts.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

# Reconfigure stdout to UTF-8 for PowerShell / Windows terminals
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, Exception):
        pass


def call_eval_api(base_url: str, timeout: int) -> dict:
    url = f"{base_url.rstrip('/')}/api/eval/run"
    req = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "BIAI-Eval-Runner/1.0",
        },
        method="POST",
    )

    attempts = 2
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read().decode("utf-8")
                return json.loads(body)
        except urllib.error.HTTPError as e:
            if e.code in (502, 503, 504) and attempt < attempts:
                print(
                    f"Received HTTP {e.code} (Render cold start). Retrying in 20 seconds...",
                    file=sys.stderr,
                )
                time.sleep(20)
                continue
            print(f"Error: HTTP {e.code} from {url}", file=sys.stderr)
            sys.exit(1)
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
            if attempt < attempts:
                print(
                    f"Connection failed ({e}). Server may be cold starting. Retrying in 20 seconds...",
                    file=sys.stderr,
                )
                time.sleep(20)
                continue
            print(f"Error: Failed to connect to {url}: {e}", file=sys.stderr)
            sys.exit(1)

    print("Error: Max retries exceeded.", file=sys.stderr)
    sys.exit(1)


def print_eval_results(data: dict) -> None:
    # Model ID and run date if present
    run_date = data.get("run_date") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    model_id = data.get("model_id") or data.get("model") or "openrouter/free (anthropic/claude-3.5-sonnet)"

    print(f"Evaluation Run Date: {run_date}")
    print(f"Model ID: {model_id}")
    print()

    # Accuracy Table
    header = f"{'Set':<16} {'N':<6} {'Category':<12} {'Language':<12} {'Interest':<12} {'Priority':<12} {'Review':<10} {'Overall':<10}"
    divider = "-" * len(header)
    print(header)
    print(divider)

    for key, label in [("samples", "Tuning (20)"), ("holdout", "Holdout (12)")]:
        subset = data.get(key, {})
        n = subset.get("total", 0)
        acc = subset.get("accuracy", {})
        cat = f"{acc.get('category', 0.0):.1f}%"
        lang = f"{acc.get('language', 0.0):.1f}%"
        inte = f"{acc.get('interest', 0.0):.1f}%"
        prio = f"{acc.get('priority', 0.0):.1f}%"
        rev = f"{acc.get('review', 0.0):.1f}%"
        over = f"{acc.get('overall', 0.0):.1f}%"
        print(f"{label:<16} {n:<6} {cat:<12} {lang:<12} {inte:<12} {prio:<12} {rev:<10} {over:<10}")

    print()

    # Mismatches List
    for key, label in [("samples", "Tuning Samples (20)"), ("holdout", "Holdout Messages (12)")]:
        subset = data.get(key, {})
        rows = subset.get("rows", [])
        mismatches = [
            r for r in rows
            if not all(r.get("match", {}).values())
        ]

        print(f"--- Mismatches: {label} ({len(mismatches)} failed) ---")
        if not mismatches:
            print("  None (100% accuracy on evaluated fields)")
        else:
            for r in mismatches:
                row_id = r.get("id")
                match = r.get("match", {})
                expected = r.get("expected", {})
                actual = r.get("actual", {})
                print(f"  Row #{row_id}:")
                for field in ["category", "language", "interest", "priority", "review"]:
                    if not match.get(field, True):
                        exp_val = expected.get("review_required" if field == "review" else field)
                        act_val = actual.get("review_required" if field == "review" else field)
                        print(f"    - {field.capitalize()}: expected '{exp_val}', got '{act_val}'")
        print()


def main():
    parser = argparse.ArgumentParser(description="BIAI CRM Evaluation Runner")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of BIAI CRM API (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="Request timeout in seconds (default: 300)",
    )
    args = parser.parse_args()

    data = call_eval_api(args.url, args.timeout)
    print_eval_results(data)


if __name__ == "__main__":
    main()

