"""app/services/github/webhook_security.py

GitHub webhook security helpers.

This module implements:
- X-Hub-Signature-256 verification (HMAC SHA-256)
- Delivery ID normalization

Designed to be unit-testable without any network or database.
"""

from __future__ import annotations

import hmac
import hashlib
from typing import Optional


def compute_github_signature_256(secret: str, payload: bytes) -> str:
    """Compute the GitHub `X-Hub-Signature-256` value for a payload.

    Returns a string in the exact header format: `sha256=<hex>`.
    """
    mac = hmac.new(secret.encode("utf-8"), msg=payload, digestmod=hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def verify_github_signature_256(
    *,
    secret: str,
    payload: bytes,
    signature_header: Optional[str],
) -> bool:
    """Verify `X-Hub-Signature-256` header.

    GitHub sends `X-Hub-Signature-256: sha256=<hex>`.

    We use constant-time comparison.
    """
    if not signature_header:
        return False

    expected = compute_github_signature_256(secret, payload)
    # Constant-time comparison to prevent timing attacks.
    return hmac.compare_digest(expected, signature_header.strip())


def normalize_delivery_id(delivery_id: Optional[str]) -> Optional[str]:
    if delivery_id is None:
        return None
    did = delivery_id.strip()
    return did or None
