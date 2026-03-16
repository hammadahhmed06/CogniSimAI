from app.models.prd_models import TimelineOutput


def test_timeline_dependencies_accepts_string():
    payload = {
        "phases": [
            {
                "phase": "Phase 1",
                "duration": "2 weeks",
                "objectives": ["Obj"],
                "deliverables": ["Del"],
                "dependencies": "Initial architectural design and provisioning",
                "milestones": "M1; M2",
            },
            {
                "phase": "Phase 2",
                "duration": "2 weeks",
                "objectives": ["Obj"],
                "deliverables": ["Del"],
                "dependencies": ["Phase 1"],
                "milestones": ["M3"],
            },
        ],
        "total_duration": "4 weeks",
        "critical_path": "A, B, C",
    }

    out = TimelineOutput.model_validate(payload)
    assert out.phases[0].dependencies == ["Initial architectural design and provisioning"]
    assert out.phases[0].milestones == ["M1", "M2"]
    assert out.critical_path == ["A", "B", "C"]
