from __future__ import annotations

import hashlib
import json
import threading
from pathlib import Path

CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache"
CACHE_FILE = CACHE_DIR / "llm_cache.json"

_lock = threading.Lock()


def _key(step: str, model: str, system_prompt: str, user_content: str) -> str:
    raw = f"{step}|{model}|{system_prompt}|{user_content}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _read_cache() -> dict[str, dict]:
    if not CACHE_FILE.exists():
        return {}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def get(step: str, model: str, system_prompt: str, user_content: str) -> dict | None:
    key = _key(step, model, system_prompt, user_content)
    with _lock:
        data = _read_cache()
        return data.get(key)


def put(step: str, model: str, system_prompt: str, user_content: str, value: dict) -> None:
    key = _key(step, model, system_prompt, user_content)
    with _lock:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        data = _read_cache()
        data[key] = value
        temp_file = CACHE_FILE.with_suffix(".tmp")
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            temp_file.replace(CACHE_FILE)
        except Exception:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)


def clear() -> None:
    with _lock:
        try:
            if CACHE_FILE.exists():
                CACHE_FILE.unlink()
        except Exception:
            pass
