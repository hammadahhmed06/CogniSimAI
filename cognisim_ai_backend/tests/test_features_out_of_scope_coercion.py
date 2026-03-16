from app.models.prd_models import FeaturesOutput


def test_features_out_of_scope_accepts_string_and_normalizes_to_list():
    payload = {
        "features": [
            {
                "id": "F1",
                "title": "Example Feature",
                "description": "This is a sufficiently long description for the feature spec to pass validation.",
                "priority": "P0",
                "user_value": "Provides value.",
                "target_personas": ["Alex"],
                "acceptance_criteria": [
                    "AC1",
                    "AC2",
                    "AC3",
                ],
                "dependencies": [],
                "estimated_effort": "M",
                "out_of_scope": "Video conferencing or voice calls.",
            }
            ,
            {
                "id": "F2",
                "title": "Example Feature 2",
                "description": "This is a sufficiently long description for the feature spec to pass validation.",
                "priority": "P1",
                "user_value": "Provides value.",
                "target_personas": ["Alex"],
                "acceptance_criteria": ["AC1", "AC2", "AC3"],
                "dependencies": [],
                "estimated_effort": "M",
                "out_of_scope": "",
            },
            {
                "id": "F3",
                "title": "Example Feature 3",
                "description": "This is a sufficiently long description for the feature spec to pass validation.",
                "priority": "P2",
                "user_value": "Provides value.",
                "target_personas": ["Alex"],
                "acceptance_criteria": ["AC1", "AC2", "AC3"],
                "dependencies": [],
                "estimated_effort": "M",
                "out_of_scope": None,
            },
        ]
    }

    out = FeaturesOutput.model_validate(payload)
    assert out.features[0].out_of_scope == ["Video conferencing or voice calls."]


def test_features_out_of_scope_accepts_list():
    payload = {
        "features": [
            {
                "id": "F1",
                "title": "Example Feature",
                "description": "This is a sufficiently long description for the feature spec to pass validation.",
                "priority": "P0",
                "user_value": "Provides value.",
                "target_personas": ["Alex"],
                "acceptance_criteria": [
                    "AC1",
                    "AC2",
                    "AC3",
                ],
                "dependencies": [],
                "estimated_effort": "M",
                "out_of_scope": ["A", "B"],
            }
            ,
            {
                "id": "F2",
                "title": "Example Feature 2",
                "description": "This is a sufficiently long description for the feature spec to pass validation.",
                "priority": "P1",
                "user_value": "Provides value.",
                "target_personas": ["Alex"],
                "acceptance_criteria": ["AC1", "AC2", "AC3"],
                "dependencies": [],
                "estimated_effort": "M",
                "out_of_scope": [],
            },
            {
                "id": "F3",
                "title": "Example Feature 3",
                "description": "This is a sufficiently long description for the feature spec to pass validation.",
                "priority": "P2",
                "user_value": "Provides value.",
                "target_personas": ["Alex"],
                "acceptance_criteria": ["AC1", "AC2", "AC3"],
                "dependencies": [],
                "estimated_effort": "M",
                "out_of_scope": None,
            },
        ]
    }

    out = FeaturesOutput.model_validate(payload)
    assert out.features[0].out_of_scope == ["A", "B"]
