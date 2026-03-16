"""app/services/github/github_app_auth.py

Enterprise-grade GitHub App auth:
- Create app JWT (signed with the GitHub App private key)
- Exchange app JWT for installation access tokens

Notes:
- Installation access tokens are short-lived. This module caches tokens in-process.
- For horizontal scaling, replace the in-process cache with Redis (not included as a dependency today).

GitHub.com only (base URLs are from settings but default to api.github.com).
"""

from __future__ import annotations

import asyncio
import time
import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import httpx
import jwt

from app.core.config import settings

logger = logging.getLogger("cognisim_ai")


@dataclass(frozen=True)
class InstallationToken:
    token: str
    expires_at_unix: int

    def is_expired(self, skew_seconds: int = 30) -> bool:
        return int(time.time()) >= (self.expires_at_unix - skew_seconds)


class GitHubAppAuthError(RuntimeError):
    pass


class GitHubAppAuth:
    """Handles GitHub App JWTs and installation access tokens."""

    def __init__(
        self,
        *,
        app_id: Optional[int] = None,
        private_key_pem: Optional[str] = None,
        api_base_url: Optional[str] = None,
        http_timeout_seconds: float = 15.0,
    ):
        self._app_id = app_id if app_id is not None else settings.GITHUB_APP_ID
        pem = private_key_pem
        if pem is None and settings.GITHUB_APP_PRIVATE_KEY_PEM is not None:
            pem = settings.GITHUB_APP_PRIVATE_KEY_PEM.get_secret_value()
        # .env files often store PEM with literal "\n" — convert to real newlines.
        if pem:
            pem = pem.replace("\\n", "\n")
        self._private_key_pem: Optional[str] = pem

        self._api_base_url = api_base_url or str(settings.GITHUB_API_BASE_URL).rstrip("/")
        self._timeout = httpx.Timeout(http_timeout_seconds)
        self._max_retries = 3
        self._base_backoff_seconds = 0.5

        if not self._app_id:
            raise GitHubAppAuthError("GITHUB_APP_ID is not configured")
        if not self._private_key_pem:
            raise GitHubAppAuthError("GITHUB_APP_PRIVATE_KEY_PEM is not configured")

        # After validation, keep a non-optional view for signing.
        self._private_key_pem_str: str = self._private_key_pem

        # in-process cache: installation_id -> InstallationToken
        self._token_cache: Dict[int, InstallationToken] = {}

    @staticmethod
    def _transient_status(status_code: int) -> bool:
        return status_code in (429, 500, 502, 503, 504)

    def _retry_delay_seconds(self, *, attempt: int, response: Optional[httpx.Response]) -> float:
        if response is not None and response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                try:
                    return max(float(retry_after), 0.1)
                except Exception:
                    pass
            rl_reset = response.headers.get("X-RateLimit-Reset")
            if rl_reset:
                try:
                    wait = float(rl_reset) - float(time.time())
                    return max(wait, 0.1)
                except Exception:
                    pass
        return min(self._base_backoff_seconds * (2 ** (attempt - 1)), 8.0)

    async def _request_with_retries(
        self,
        *,
        method: str,
        url: str,
        headers: Dict[str, str],
    ) -> httpx.Response:
        last_response: Optional[httpx.Response] = None
        last_error: Optional[Exception] = None

        for attempt in range(1, self._max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    resp = await client.request(method=method, url=url, headers=headers)

                if resp.status_code < 400:
                    return resp

                last_response = resp
                if attempt < self._max_retries and self._transient_status(resp.status_code):
                    await asyncio.sleep(self._retry_delay_seconds(attempt=attempt, response=resp))
                    continue

                return resp
            except httpx.RequestError as e:
                last_error = e
                if attempt < self._max_retries:
                    await asyncio.sleep(self._retry_delay_seconds(attempt=attempt, response=None))
                    continue
                break

        if last_response is not None:
            return last_response
        raise GitHubAppAuthError(f"GitHub auth request failed after retries: {last_error}")

    def create_app_jwt(self) -> str:
        """Create a short-lived JWT for authenticating as the GitHub App."""
        now = int(time.time())
        payload = {
            "iat": now - 10,  # small clock skew
            "exp": now + 9 * 60,  # 9 minutes
            "iss": str(self._app_id),
        }
        try:
            return jwt.encode(payload, self._private_key_pem_str, algorithm="RS256")
        except Exception as e:
            raise GitHubAppAuthError(f"Failed to sign GitHub App JWT: {e}") from e

    async def get_installation_token(self, installation_id: int) -> InstallationToken:
        """Get (and cache) an installation access token."""
        cached = self._token_cache.get(installation_id)
        if cached and not cached.is_expired():
            return cached

        app_jwt = self.create_app_jwt()
        url = f"{self._api_base_url}/app/installations/{installation_id}/access_tokens"

        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        resp = await self._request_with_retries(method="POST", url=url, headers=headers)

        if resp.status_code >= 400:
            logger.error("GitHub installation token fetch failed: %s %s", resp.status_code, resp.text)
            raise GitHubAppAuthError(
                f"Failed to fetch installation token (status={resp.status_code})"
            )

        data = resp.json()
        token = data.get("token")
        expires_at = data.get("expires_at")
        if not token or not expires_at:
            raise GitHubAppAuthError("GitHub response missing token/expires_at")

        # expires_at is ISO8601 e.g. 2025-01-01T00:00:00Z
        # We parse conservatively without extra deps.
        expires_unix = _iso8601_utc_to_unix(expires_at)
        it = InstallationToken(token=str(token), expires_at_unix=expires_unix)
        self._token_cache[installation_id] = it
        return it

    async def get_installation_info(self, installation_id: int) -> Dict[str, Any]:
        """Fetch installation metadata (account, permissions, events, repo selection)."""
        app_jwt = self.create_app_jwt()
        url = f"{self._api_base_url}/app/installations/{installation_id}"
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        resp = await self._request_with_retries(method="GET", url=url, headers=headers)
        if resp.status_code >= 400:
            logger.error("GitHub installation info fetch failed: %s %s", resp.status_code, resp.text)
            raise GitHubAppAuthError(
                f"Failed to fetch installation info (status={resp.status_code})"
            )
        return resp.json()


def _iso8601_utc_to_unix(value: str) -> int:
    """Parse an ISO8601 UTC timestamp (ending with Z) to unix seconds."""
    # Expected format: YYYY-MM-DDTHH:MM:SSZ
    # Avoid adding a heavy dependency; use stdlib.
    from datetime import datetime, timezone

    v = value.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    dt = datetime.fromisoformat(v)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


_github_app_auth_singleton: Optional[GitHubAppAuth] = None


def get_github_app_auth() -> GitHubAppAuth:
    global _github_app_auth_singleton
    if _github_app_auth_singleton is None:
        _github_app_auth_singleton = GitHubAppAuth()
    return _github_app_auth_singleton
