from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

from app.api.routes import prd as prd_routes
from app.models.prd_models import PRDDocument, PRDInput


def test_save_prd_document_scales_legacy_overall_quality_score(monkeypatch):
    # Mock supabase.table().insert().execute()
    execute = MagicMock()
    insert = MagicMock(return_value=MagicMock(execute=execute))
    table = MagicMock(return_value=MagicMock(insert=insert))
    monkeypatch.setattr(prd_routes, "supabase", MagicMock(table=table))

    user_id = uuid4()
    workspace_id = uuid4()

    prd_input = PRDInput(
        problem_statement="x" * 60,
        target_users=["A", "B"],
        constraints=None,
        product_name="Test",
        template_version="1.0",
    )

    prd = PRDDocument(
        id=uuid4(),
        title="Test",
        quality_score=87.5,  # 0-100
        input=prd_input,
    )

    prd_routes._save_prd_document(
        prd=prd,
        prd_input=prd_input,
        user_id=user_id,
        workspace_id=workspace_id,
        run_id=None,
    )

    payload = insert.call_args[0][0]
    assert payload["overall_quality_score"] == 8.75


def test_save_prd_document_clamps_legacy_overall_quality_score(monkeypatch):
    execute = MagicMock()
    insert = MagicMock(return_value=MagicMock(execute=execute))
    table = MagicMock(return_value=MagicMock(insert=insert))
    monkeypatch.setattr(prd_routes, "supabase", MagicMock(table=table))

    user_id = uuid4()
    workspace_id = uuid4()

    prd_input = PRDInput(
        problem_statement="x" * 60,
        target_users=["A", "B"],
        constraints=None,
        product_name="Test",
        template_version="1.0",
    )

    prd = PRDDocument(
        id=uuid4(),
        title="Test",
        # 100.0 is valid for PRDDocument, but legacy overall_quality_score must be < 10,
        # so (100/10)=10.0 must clamp to 9.99.
        quality_score=100.0,
        input=prd_input,
    )

    prd_routes._save_prd_document(
        prd=prd,
        prd_input=prd_input,
        user_id=user_id,
        workspace_id=workspace_id,
        run_id=None,
    )

    payload = insert.call_args[0][0]
    assert payload["overall_quality_score"] == 9.99
