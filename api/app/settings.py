from datetime import datetime
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_FILE = REPO_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    llm_provider: str = "openrouter"
    llm_model: str = "anthropic/claude-3.5-sonnet"
    llm_api_key: str = "replace-me"
    llm_base_url: str = "https://openrouter.ai/api/v1"
    database_url: str = "sqlite:///./biai_crm.db"
    demo_date: datetime = datetime(2026, 11, 1, 0, 0, 0)


settings = Settings()
