from __future__ import annotations

import pytest

from app.api.routes import prd as prd_routes


def test_export_to_pdf_produces_valid_pdf_bytes():
    # Skip gracefully if dependency is not available in some environments.
    pytest.importorskip("fpdf")

    prd_data = {
        "id": "00000000-0000-0000-0000-000000000000",
        "title": "Test PRD",
        "template_version": "1.0",
        "status": "draft",
        "created_at": "2025-12-20T00:00:00Z",
        "sections": {
            "executive_summary": {
                "vision": "A" * 60,
                "problem_statement": "B" * 120,
                "solution_overview": "C" * 120,
                "key_objectives": ["Obj 1", "Obj 2", "Obj 3"],
                "success_metrics": [{"name": "m", "target": "t", "measurement": "x"}],
            },
            "personas": [],
            "features": [],
            "technical": {},
            "risks": [],
            "timeline": [],
        },
    }

    pdf_bytes = prd_routes._export_to_pdf(prd_data)

    assert isinstance(pdf_bytes, (bytes, bytearray))
    assert bytes(pdf_bytes).startswith(b"%PDF")
    assert len(pdf_bytes) > 100
