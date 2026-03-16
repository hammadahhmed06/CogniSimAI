import pytest

from app.agents import epic_decomposer as ed


def test_safe_parse_json_recovers_balanced_braces():
    raw = """
    ```json
    some noise
    {"stories": [{"title": "Story A", "acceptance_criteria": ["A", "B"]}],}
    ```
    """
    parsed = ed._safe_parse_json(raw)
    assert parsed is not None
    assert parsed.get("stories")
    assert parsed["stories"][0]["title"] == "Story A"


def test_schema_validate_synthesizes_missing_fields():
    parsed = {"stories": [{"title": "Story B", "acceptance_criteria": []}]}
    stories, warnings = ed._schema_validate(parsed)
    assert stories is not None
    assert len(stories) == 1
    story = stories[0]
    # synthesized criteria and user_value
    assert len(story["acceptance_criteria"]) >= 1
    assert "user_value" in story
    assert any("synthesized" in w for w in warnings)


def test_quality_gate_skips_reviewer_when_clean():
    # Minimal StoryDraft with >=3 criteria should set skip gate true
    sd = ed.StoryDraft(
        epic="Epic",
        rationale="Rationale that is sufficiently long.",
        stories=[ed.StoryCandidate(
            title="Login",
            persona="User",
            user_value="I can access my account",
            acceptance_criteria=[
                "User can sign in with valid credentials",
                "Shows error message on wrong password entry",
                "Rate limiting protects against brute force attempts",
            ],
        )]
    )
    _, warnings = ed._schema_validate({"stories": [s.model_dump() for s in sd.stories]})
    min_criteria = all(len(s.acceptance_criteria) >= 3 for s in sd.stories)
    max_criteria = all(len(s.acceptance_criteria) <= 8 for s in sd.stories)
    skip_reviewer = not warnings and min_criteria and max_criteria and len(sd.stories) <= 6
    assert skip_reviewer
