import pytest

from app.services.github.webhook_security import (
    compute_github_signature_256,
    normalize_delivery_id,
    verify_github_signature_256,
)


def test_compute_and_verify_signature_round_trip():
    secret = "super-secret"
    payload = b"{\"hello\":\"world\"}"

    sig = compute_github_signature_256(secret, payload)
    assert sig.startswith("sha256=")

    assert verify_github_signature_256(secret=secret, payload=payload, signature_header=sig) is True


def test_verify_signature_rejects_missing_or_wrong():
    secret = "super-secret"
    payload = b"payload"

    assert verify_github_signature_256(secret=secret, payload=payload, signature_header=None) is False
    assert verify_github_signature_256(secret=secret, payload=payload, signature_header="") is False

    wrong = compute_github_signature_256("other-secret", payload)
    assert verify_github_signature_256(secret=secret, payload=payload, signature_header=wrong) is False


@pytest.mark.parametrize(
    "raw,expected",
    [
        (None, None),
        ("", None),
        ("   ", None),
        ("abc", "abc"),
        ("  abc  ", "abc"),
    ],
)
def test_normalize_delivery_id(raw, expected):
    assert normalize_delivery_id(raw) == expected
