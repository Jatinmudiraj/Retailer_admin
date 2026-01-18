from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    ENV: str = "dev"
    BACKEND_URL: str = "http://localhost:9001"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    DATABASE_URL: str

    GOOGLE_CLIENT_ID: str

    JWT_SECRET: str
    COOKIE_SECURE: int = 0

    ADMIN_EMAILS: str = ""
    ADMIN_DOMAINS: str = ""

    MEDIA_DIR: str = "./media"

    GOLD_RATE_PER_GRAM: float = 6500.0

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET_NAME: str = ""


def get_settings() -> Settings:
    return Settings()
