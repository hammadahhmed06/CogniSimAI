from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

from app.api.routes import prd as prd_routes


def test_update_prd_run_uses_ended_at(monkeypatch):
    run_id = uuid4()

    # Mock the chained supabase.table().update().eq().execute()
    execute = MagicMock()
    eq = MagicMock(return_value=MagicMock(execute=execute))
    update = MagicMock(return_value=MagicMock(eq=eq))
    table = MagicMock(return_value=MagicMock(update=update))

    monkeypatch.setattr(prd_routes, "supabase", MagicMock(table=table))

    prd_routes._update_prd_run(run_id=run_id, status="completed", output={"ok": True})

    # Verify we wrote ended_at (and did not write completed_at)
    assert update.called
    update_payload = update.call_args[0][0]
    assert "ended_at" in update_payload
    assert "completed_at" not in update_payload
