from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

from app.api.routes import prd as prd_routes


def test_log_audit_event_inserts_user_id_and_details(monkeypatch):
    prd_id = uuid4()
    user_id = uuid4()

    execute = MagicMock()
    insert = MagicMock(return_value=MagicMock(execute=execute))
    table = MagicMock(return_value=MagicMock(insert=insert))

    monkeypatch.setattr(prd_routes, "supabase", MagicMock(table=table))

    prd_routes._log_audit_event(
        prd_id=prd_id,
        action="approve",
        user_id=user_id,
        user_email="user@example.com",
        section="executive_summary",
        previous_value={"old": True},
        new_value={"new": True},
    )

    assert table.called
    assert insert.called

    payload = insert.call_args[0][0]
    assert payload["prd_id"] == str(prd_id)
    assert payload["action"] == "approve"
    assert payload["user_id"] == str(user_id)
    assert payload["user_email"] == "user@example.com"

    assert "details" in payload
    assert payload["details"]["section"] == "executive_summary"
    assert payload["details"]["previous_value"] == {"old": True}
    assert payload["details"]["new_value"] == {"new": True}

    # These fields are from an older schema and should not be sent.
    assert "changed_by" not in payload
    assert "changed_at" not in payload
    assert "section" not in payload
    assert "previous_value" not in payload
    assert "new_value" not in payload
