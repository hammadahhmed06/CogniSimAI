# config.py
# Centralized configuration management for the CogniSim AI application.

import os
from pathlib import Path
# --- FIX: Import BaseSettings and SettingsConfigDict from 'pydantic_settings' ---
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file so it works regardless of working directory.
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
from pydantic import (
    AliasChoices,
    AnyHttpUrl,
    Field,
    PrivateAttr,
    SecretStr,
    field_validator,
    model_validator,
)
from typing import List, Optional, Sequence

class Settings(BaseSettings):
    """
    Defines and validates all application settings, loading them from environment variables.
    """
    # --- FIX: Use the modern 'model_config' for Pydantic v2 ---
    # This replaces the legacy 'class Config' and is more reliable.
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8-sig",  # utf-8-sig auto-strips BOM if present
        extra="ignore"  # Ignore extra fields in .env file
    )

    # --- Application Metadata ---
    APP_NAME: str = "CogniSim AI - Backend API"
    APP_VERSION: str = "1.3.0"

    # --- Supabase Configuration ---
    # These are critical and will raise an error if not set.
    # Using SecretStr hides the value in logs and tracebacks for better security.
    SUPABASE_URL: Optional[AnyHttpUrl] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[SecretStr] = None
    SUPABASE_ANON_KEY: Optional[SecretStr] = None

    # --- OAuth Configuration ---
    GITHUB_LOGIN: Optional[AnyHttpUrl] = None
    GOOGLE_LOGIN: Optional[AnyHttpUrl] = None
    
    # --- Jira OAuth Configuration ---
    JIRA_OAUTH_CLIENT_ID: Optional[str] = None
    JIRA_OAUTH_CLIENT_SECRET: Optional[SecretStr] = None
    JIRA_OAUTH_REDIRECT_URI: Optional[str] = None
    JIRA_WEBHOOK_URL: Optional[str] = None  # URL where Jira webhooks will be received
    FRONTEND_URL: str = "http://localhost:8080"
    
    # --- Railway Deployment Configuration ---
    # Railway provides these environment variables automatically
    RAILWAY_STATIC_URL: Optional[str] = None  # e.g., "https://yourapp.up.railway.app"
    RAILWAY_PUBLIC_DOMAIN: Optional[str] = None  # e.g., "yourapp.railway.app"
    
    # --- Slack OAuth Configuration ---
    SLACK_CLIENT_ID: Optional[str] = None
    SLACK_CLIENT_SECRET: Optional[SecretStr] = None
    SLACK_REDIRECT_URI: Optional[str] = None  # e.g., http://localhost:8000/api/slack/oauth/callback
    SLACK_SIGNING_SECRET: Optional[SecretStr] = None  # For verifying Slack webhook requests

    # --- GitHub App Configuration (Enterprise-grade, GitHub.com) ---
    # This integration uses a GitHub App (installation-based) rather than OAuth/PATs.
    # Note: GitHub App private key is multi-line PEM; store it with literal \n or as a multi-line env var.
    GITHUB_APP_ID: Optional[int] = None
    GITHUB_APP_SLUG: Optional[str] = None  # e.g., "cognisim-ai"
    GITHUB_APP_PRIVATE_KEY_PEM: Optional[SecretStr] = None
    GITHUB_WEBHOOK_SECRET: Optional[SecretStr] = None

    @field_validator("GITHUB_APP_ID", mode="before")
    @classmethod
    def _empty_str_to_none_int(cls, v):  # noqa: N805
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    # Base URLs are fixed to GitHub.com for this project.
    GITHUB_API_BASE_URL: str = "https://api.github.com"
    GITHUB_GRAPHQL_URL: str = "https://api.github.com/graphql"
    GITHUB_WEB_BASE_URL: str = "https://github.com"

    # --- CORS Origins ---
    # A list of allowed origins for Cross-Origin Resource Sharing (CORS).
    # It's a string of comma-separated URLs.
    CORS_ORIGINS_RAW: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices('CORS_ORIGINS'),
        alias='CORS_ORIGINS',
        exclude=True,
    )
    _cors_origins: List[str] = PrivateAttr(default_factory=list)

    @model_validator(mode='after')
    def populate_cors(self) -> 'Settings':
        self._cors_origins = self._parse_cors_origins(self.CORS_ORIGINS_RAW)
        return self

    @property
    def cors_origins(self) -> List[str]:
        """Preferred accessor for parsed CORS origins."""
        return self._cors_origins

    @property
    def CORS_ORIGINS(self) -> List[str]:  # pragma: no cover - backward compatibility alias
        """Backward-compatible accessor matching legacy settings attribute name."""
        return self._cors_origins

    @staticmethod
    def _parse_cors_origins(value: Optional[str]) -> List[str]:
        if not value:
            return []

        text = value.strip()
        if not text:
            return []

        if text.startswith("CORS_ORIGINS="):
            text = text.split("=", 1)[1].strip()

        if text.startswith("[") and text.endswith("]"):
            text = text[1:-1]

        parts = []
        for segment in text.split(","):
            cleaned = segment.strip().strip('"').strip("'")
            if cleaned:
                parts.append(cleaned)

        # Deduplicate while preserving order
        seen = set()
        deduped: List[str] = []
        for origin in parts:
            if origin not in seen:
                seen.add(origin)
                deduped.append(origin)

        return deduped

    # --- Redis Configuration ---
    # Redis Cloud connection settings
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[SecretStr] = None
    REDIS_USERNAME: str = "default"
    REDIS_URL: Optional[str] = None  # Alternative: full Redis URL

    # --- Encryption Configuration ---
    # Encryption settings for secure credential storage
    ENCRYPTION_SECRET_KEY: Optional[SecretStr] = None
    ENCRYPTION_SALT: Optional[str] = None

    # --- Development Mode ---
    # For development, we can use a simple encoding instead of encryption
    DEV_MODE: bool = True

    # --- Team Quotas ---
    # Daily cap on agent runs per team
    TEAM_DAILY_RUN_LIMIT: int = 100
    # Optional token budget over last 30 days (sum of input+output tokens)
    TEAM_30D_TOKEN_LIMIT: Optional[int] = None


# Create a single, importable instance of the settings
settings = Settings()

# Validate that required settings are provided - only in production
if not settings.DEV_MODE:
    if settings.SUPABASE_URL is None or settings.SUPABASE_SERVICE_ROLE_KEY is None:
        import logging
        logging.warning("⚠️ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY should be set in environment variables")
        logging.warning("⚠️ Please add environment variables in Railway Dashboard → Variables")
