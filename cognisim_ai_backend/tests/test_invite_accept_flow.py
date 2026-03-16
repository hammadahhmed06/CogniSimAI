#!/usr/bin/env python3
"""Lightweight unit-style tests for /api/auth/accept-invite logic.

These tests do NOT require a real Supabase instance.
They monkeypatch the `supabase` client inside `app.api.routes.auth_invite`.

Run:
  python tests/test_invite_accept_flow.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

# Ensure the backend package root is on sys.path so `import app...` works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class FakeResponse:
    def __init__(self, data: Any):
        self.data = data


@dataclass
class _Op:
    table: str
    kind: str
    payload: dict | None = None
    filters: dict = field(default_factory=dict)


class FakeTable:
    def __init__(self, client: "FakeSupabase", name: str):
        self.client = client
        self.name = name
        self._filters: Dict[str, Any] = {}
        self._select: Optional[str] = None
        self._mode: Optional[str] = None
        self._payload: Optional[dict] = None

    def select(self, cols: str):
        self._select = cols
        return self

    def eq(self, key: str, value: Any):
        self._filters[key] = value
        return self

    def maybe_single(self):
        return self

    def insert(self, payload: dict):
        self._mode = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict):
        self._mode = "update"
        self._payload = payload
        return self

    def execute(self):
        # Record write operations
        if self._mode in {"insert", "update"}:
            self.client.ops.append(_Op(self.name, self._mode, self._payload, dict(self._filters)))
            # Apply simplistic update/insert behavior
            if self._mode == "insert":
                self.client.tables.setdefault(self.name, []).append(dict(self._payload))
                return FakeResponse([dict(self._payload)])
            if self._mode == "update":
                rows = self.client.tables.get(self.name, [])
                updated: List[dict] = []
                for r in rows:
                    if all(str(r.get(k)) == str(v) for k, v in self._filters.items()):
                        r.update(self._payload or {})
                        updated.append(dict(r))
                return FakeResponse(updated)

        # Read operation
        rows = self.client.tables.get(self.name, [])
        matches: List[dict] = []
        for r in rows:
            ok = True
            for k, v in self._filters.items():
                if str(r.get(k)) != str(v):
                    ok = False
                    break
            if ok:
                matches.append(dict(r))

        if not matches:
            return FakeResponse(None)
        return FakeResponse(matches[0])


class FakeSupabase:
    def __init__(self, tables: Optional[dict[str, list[dict]]] = None):
        self.tables: dict[str, list[dict]] = tables or {}
        self.ops: list[_Op] = []

    def table(self, name: str) -> FakeTable:
        return FakeTable(self, name)


def _assert(cond: bool, msg: str):
    if not cond:
        raise AssertionError(msg)


def test_missing_token_400():
    from app.api.routes import auth_invite as m

    m.supabase = FakeSupabase({"invitations": []})  # type: ignore
    user = m.UserModel(id=UUID(int=1), email="a@b.com")
    try:
        m.accept_invitation(m.AcceptInviteRequest(token=""), current_user=user)
        raise AssertionError("Expected HTTPException")
    except Exception as e:
        # FastAPI HTTPException has status_code
        _assert(getattr(e, "status_code", None) == 400, f"Expected 400, got {getattr(e, 'status_code', None)}")


def test_invite_not_found_404():
    from app.api.routes import auth_invite as m

    m.supabase = FakeSupabase({"invitations": []})  # type: ignore
    user = m.UserModel(id=UUID(int=1), email="a@b.com")
    try:
        m.accept_invitation(m.AcceptInviteRequest(token=str(uuid4())), current_user=user)
        raise AssertionError("Expected HTTPException")
    except Exception as e:
        _assert(getattr(e, "status_code", None) == 404, f"Expected 404, got {getattr(e, 'status_code', None)}")


def test_email_mismatch_403():
    from app.api.routes import auth_invite as m

    tok = str(uuid4())
    inv_id = str(uuid4())
    fake = FakeSupabase(
        {
            "invitations": [
                {
                    "id": inv_id,
                    "token": tok,
                    "email": "invited@example.com",
                    "status": "pending",
                    "role": "viewer",
                }
            ]
        }
    )
    m.supabase = fake  # type: ignore

    user = m.UserModel(id=UUID(int=1), email="other@example.com")
    try:
        m.accept_invitation(m.AcceptInviteRequest(token=tok), current_user=user)
        raise AssertionError("Expected HTTPException")
    except Exception as e:
        _assert(getattr(e, "status_code", None) == 403, f"Expected 403, got {getattr(e, 'status_code', None)}")


def test_workspace_invite_activates_existing_row():
    from app.api.routes import auth_invite as m

    tok = str(uuid4())
    inv_id = str(uuid4())
    ws_id = str(uuid4())
    invited_email = "person@example.com"

    fake = FakeSupabase(
        {
            "invitations": [
                {
                    "id": inv_id,
                    "token": tok,
                    "email": invited_email,
                    "workspace_id": ws_id,
                    "status": "pending",
                    "role": "member",
                }
            ],
            "workspace_members": [
                {
                    "id": str(uuid4()),
                    "workspace_id": ws_id,
                    "invited_email": invited_email,
                    "user_id": None,
                    "role": "viewer",
                    "status": "invited",
                }
            ],
            "team_members": [],
        }
    )
    m.supabase = fake  # type: ignore

    user_id = UUID(int=2)
    user = m.UserModel(id=user_id, email=invited_email)
    out = m.accept_invitation(m.AcceptInviteRequest(token=tok), current_user=user)

    _assert(out.get("workspace_id") == ws_id, "workspace_id not returned")
    _assert(out.get("workspace_added") is True, "workspace_added should be True")

    # Should UPDATE existing workspace_members row (not insert a new one)
    updates = [op for op in fake.ops if op.table == "workspace_members" and op.kind == "update"]
    inserts = [op for op in fake.ops if op.table == "workspace_members" and op.kind == "insert"]
    _assert(len(updates) == 1, f"Expected 1 workspace_members update, got {len(updates)}")
    _assert(len(inserts) == 0, f"Expected 0 workspace_members inserts, got {len(inserts)}")

    # Invitation should be marked accepted
    inv_updates = [op for op in fake.ops if op.table == "invitations" and op.kind == "update"]
    _assert(inv_updates, "Expected invitation update to accepted")


def main():
    tests = [
        test_missing_token_400,
        test_invite_not_found_404,
        test_email_mismatch_403,
        test_workspace_invite_activates_existing_row,
    ]

    for t in tests:
        t()
        print(f"✅ {t.__name__}")

    print("\nAll invitation accept-flow tests passed.")


if __name__ == "__main__":
    main()
