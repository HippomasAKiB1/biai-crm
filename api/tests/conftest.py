import os
import pytest

os.environ["LLM_PROVIDER"] = "openrouter"
os.environ["LLM_MODEL"] = "dummy-model"
os.environ["LLM_API_KEY"] = "dummy-key-not-real"
os.environ["LLM_BASE_URL"] = "http://dummy.local/api/v1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEMO_DATE"] = "2026-11-01T00:00:00"

