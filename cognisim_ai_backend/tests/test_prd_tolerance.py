import pytest

from pydantic import ValidationError

from app.models.prd_models import TechnicalRequirements


def test_technical_requirements_allows_placeholders():
    tr = TechnicalRequirements(
        architecture_overview="To be defined",
        performance_requirements=["To be defined"],
        security_requirements=["To be defined"],
        scalability_considerations=["To be defined"],
        integrations=[],
    )

    assert tr.architecture_overview
    assert len(tr.performance_requirements) >= 1
    assert len(tr.security_requirements) >= 1


def test_technical_requirements_rejects_empty_lists():
    # Still reject completely empty required lists
    with pytest.raises(ValidationError):
        TechnicalRequirements(
            architecture_overview="x",
            performance_requirements=[],
            security_requirements=[],
            scalability_considerations=[],
        )
