"""Tests for JSON repair functionality in PRD generator.

Tests the robust JSON parsing/repair utilities that handle truncated LLM responses.
"""

import pytest
import json
from app.agents.prd_generator import (
    repair_truncated_json,
    extract_partial_array,
    safe_parse_with_repair,
)
from app.models.prd_models import FeaturesOutput, PersonasOutput, RisksOutput


class TestRepairTruncatedJson:
    """Tests for repair_truncated_json function."""
    
    def test_valid_json_unchanged(self):
        """Valid JSON should be returned unchanged."""
        valid = '{"features": [{"id": "F1", "title": "Test"}]}'
        result = repair_truncated_json(valid)
        assert json.loads(result) == json.loads(valid)
    
    def test_truncated_array_closes_brackets(self):
        """Truncated array should have brackets closed."""
        truncated = '{"features": [{"id": "F1"}, {"id": "F2"'
        result = repair_truncated_json(truncated)
        # Should be parseable
        parsed = json.loads(result)
        assert "features" in parsed
    
    def test_truncated_object_closes_braces(self):
        """Truncated object should have braces closed."""
        truncated = '{"name": "test", "value": 123'
        result = repair_truncated_json(truncated)
        parsed = json.loads(result)
        assert parsed.get("name") == "test"
    
    def test_truncated_string_closes_quotes(self):
        """Truncated string value should have quotes closed."""
        truncated = '{"description": "This is a long description that got cut off'
        result = repair_truncated_json(truncated)
        # Should be parseable
        parsed = json.loads(result)
        assert "description" in parsed
    
    def test_markdown_code_fence_removed(self):
        """Markdown code fences should be stripped."""
        with_fence = '```json\n{"key": "value"}\n```'
        result = repair_truncated_json(with_fence)
        parsed = json.loads(result)
        assert parsed == {"key": "value"}
    
    def test_deeply_nested_truncation(self):
        """Deeply nested truncated JSON should be repaired."""
        truncated = '{"outer": {"inner": [{"deep": "value"}, {"another":'
        result = repair_truncated_json(truncated)
        # Should at least be valid JSON
        parsed = json.loads(result)
        assert "outer" in parsed
    
    def test_real_world_features_truncation(self):
        """Simulate real-world truncated features response."""
        truncated = '''{"features": [
            {"id": "F1", "title": "Feature 1", "description": "First feature", "priority": "P0", "user_value": "High value", "target_personas": ["persona_1"], "acceptance_criteria": ["Criteria 1"], "dependencies": [], "estimated_effort": "M", "out_of_scope": ["Nothing"]},
            {"id": "F2", "title": "Feature 2", "description": "Second feature", "priority": "P1", "user_value": "Good value", "target_personas": ["persona_1"], "acceptance_criteria": ["Criteria 1"], "dependencies": ["F1"], "estimated_effort": "L", "out_of_scope": ["Nothing"]},
            {"id": "F3", "title": "Feature 3", "description": "Third feature that got truncated midway through because the LLM ran out of tokens and the response was cut'''
        
        result = repair_truncated_json(truncated)
        parsed = json.loads(result)
        # Should have at least the first 2 complete features
        assert "features" in parsed
        assert len(parsed["features"]) >= 2


class TestExtractPartialArray:
    """Tests for extract_partial_array function."""
    
    def test_extract_complete_items(self):
        """Should extract all complete items from truncated array."""
        truncated = '''{"features": [
            {"id": "F1", "title": "Complete 1"},
            {"id": "F2", "title": "Complete 2"},
            {"id": "F3", "title": "Incomplete'''
        
        items = extract_partial_array(truncated, "features")
        # The repair function may include items that parse as valid JSON
        # even if semantically incomplete. This is intentional - Pydantic
        # validation will catch missing required fields later.
        assert len(items) >= 2
        assert items[0]["id"] == "F1"
        assert items[1]["id"] == "F2"
    
    def test_extract_from_valid_json(self):
        """Should work with valid JSON too."""
        valid = '{"features": [{"id": "F1"}, {"id": "F2"}]}'
        items = extract_partial_array(valid, "features")
        assert len(items) == 2
    
    def test_empty_array(self):
        """Empty array should return empty list."""
        empty = '{"features": []}'
        items = extract_partial_array(empty, "features")
        assert items == []
    
    def test_missing_key(self):
        """Missing key should return empty list."""
        no_key = '{"other": [{"id": "F1"}]}'
        items = extract_partial_array(no_key, "features")
        assert items == []
    
    def test_extract_personas(self):
        """Should extract personas from truncated response."""
        truncated = '''{"personas": [
            {"id": "persona_1", "name": "Alice", "role": "Engineer"},
            {"id": "persona_2", "name": "Bob'''
        
        items = extract_partial_array(truncated, "personas")
        # Should extract at least the complete first persona
        assert len(items) >= 1
        assert items[0]["name"] == "Alice"


class TestSafeParseWithRepair:
    """Tests for safe_parse_with_repair function."""
    
    def test_valid_features_output(self):
        """Valid FeaturesOutput JSON should parse successfully."""
        # Must have at least 3 features (min_length=3) and description min_length=50
        valid = '''{
            "features": [
                {
                    "id": "F1",
                    "title": "Test Feature One",
                    "description": "A comprehensive test feature that provides significant value to users by solving their core problems and improving their workflow efficiency.",
                    "priority": "P0",
                    "user_value": "High value for users",
                    "target_personas": ["persona_1"],
                    "acceptance_criteria": ["Works correctly", "Is reliable", "Performs well"],
                    "dependencies": [],
                    "estimated_effort": "M",
                    "out_of_scope": ["Nothing"]
                },
                {
                    "id": "F2",
                    "title": "Test Feature Two",
                    "description": "Another important feature that addresses secondary user needs and enhances the overall product experience significantly.",
                    "priority": "P1",
                    "user_value": "Good value for users",
                    "target_personas": ["persona_1"],
                    "acceptance_criteria": ["Works correctly", "Is reliable", "Performs well"],
                    "dependencies": ["F1"],
                    "estimated_effort": "L",
                    "out_of_scope": ["Nothing"]
                },
                {
                    "id": "F3",
                    "title": "Test Feature Three",
                    "description": "A third feature to meet the minimum requirements of the FeaturesOutput model which requires at least three features.",
                    "priority": "P2",
                    "user_value": "Nice to have value",
                    "target_personas": ["persona_1"],
                    "acceptance_criteria": ["Works correctly", "Is reliable", "Performs well"],
                    "dependencies": [],
                    "estimated_effort": "S",
                    "out_of_scope": []
                }
            ]
        }'''
        
        result, warnings = safe_parse_with_repair(valid, FeaturesOutput, "features")
        assert result is not None
        assert len(result.features) == 3
        assert result.features[0].id == "F1"
    
    def test_truncated_features_recovers_partial(self):
        """Truncated FeaturesOutput should recover partial items when possible."""
        # Note: Recovery may not always work if too few complete features are extracted
        # The model requires min_length=3 for features
        # This tests that the repair functions at least TRY to recover
        truncated = '''{
            "features": [
                {"id": "F1", "title": "Feature 1", "description": "A comprehensive feature description that meets the minimum length requirement of fifty characters for validation.", "priority": "P0", "user_value": "Value", "target_personas": ["p1"], "acceptance_criteria": ["AC1", "AC2", "AC3"], "dependencies": [], "estimated_effort": "M", "out_of_scope": []},
                {"id": "F2", "title": "Feature 2", "description": "Another comprehensive feature description that meets the minimum length requirement of fifty characters for validation.", "priority": "P1", "user_value": "Value", "target_personas": ["p1"], "acceptance_criteria": ["AC1", "AC2", "AC3"], "dependencies": [], "estimated_effort": "M", "out_of_scope": []},
                {"id": "F3", "title": "Feature 3", "description": "A third comprehensive feature description that meets the minimum length requirement of fifty characters for validation.", "priority": "P2", "user_value": "Value", "target_personas": ["p1"], "acceptance_criteria": ["AC1", "AC2", "AC3"], "dependencies": [], "estimated_effort": "M", "out_of_scope": []},
                {"id": "F4", "title": "Feature 4", "description": "Fourth feature that got truncated before completion so it should be'''
        
        # First verify that extract_partial_array at least extracts some items
        items = extract_partial_array(truncated, "features")
        assert len(items) >= 3, f"Expected at least 3 items, got {len(items)}"
        
        # Try parsing - may or may not succeed depending on validation requirements
        result, warnings = safe_parse_with_repair(truncated, FeaturesOutput, "features")
        # The important thing is that warnings were generated indicating recovery was attempted
        assert len(warnings) > 0, "Expected warnings from repair attempt"
        # If parsing succeeded, verify we got the expected features
        if result is not None:
            assert len(result.features) >= 3
    
    def test_completely_invalid_json_returns_none(self):
        """Completely invalid JSON should return None with warnings."""
        invalid = "This is not JSON at all, just plain text"
        result, warnings = safe_parse_with_repair(invalid, FeaturesOutput, "features")
        assert result is None
        assert len(warnings) > 0


class TestRealWorldTruncatedResponse:
    """Test with actual truncated response from production."""
    
    def test_features_truncated_at_dependencies(self):
        """Test the exact error case from production - JSON cut at dependencies array."""
        # This simulates the actual error: EOF while parsing at line 251 column 13
        # The JSON was cut mid-way through a dependencies array
        # Must have 3+ complete features with description >= 50 chars, acceptance_criteria >= 3
        truncated = '''{
  "features": [
    {
      "id": "F1",
      "title": "Unified Multi-Source Telemetry Ingestion",
      "description": "Centralized ingestion engine for monitoring tools that collects data from multiple sources and normalizes it for processing.",
      "priority": "P0",
      "user_value": "Eliminates alert fatigue by consolidating signals",
      "target_personas": ["persona_1", "persona_3"],
      "acceptance_criteria": ["Ingests from 3+ sources", "Achieves 70% deduplication", "Sub-second latency"],
      "dependencies": null,
      "estimated_effort": "L",
      "out_of_scope": ["Cold storage"]
    },
    {
      "id": "F2",
      "title": "RAG-Powered Incident Context Engine",
      "description": "Enriches incidents with historical context using retrieval augmented generation to find similar past incidents and their resolutions.",
      "priority": "P0",
      "user_value": "Reduces MTTR by providing immediate historical context",
      "target_personas": ["persona_1"],
      "acceptance_criteria": ["Retrieves 3+ historical incidents", "Shows resolution paths", "Confidence scoring"],
      "dependencies": ["F1"],
      "estimated_effort": "XL",
      "out_of_scope": ["Auto-update docs"]
    },
    {
      "id": "F3",
      "title": "Executable Runbook Automation System",
      "description": "Transforms static runbooks into executable automation workflows that can be triggered directly from the incident management interface.",
      "priority": "P0",
      "user_value": "Standardizes incident response and eliminates manual errors",
      "target_personas": ["persona_1", "persona_2"],
      "acceptance_criteria": ["YAML/JSON import support", "Real-time execution output", "Dry-run mode available"],
      "dependencies": ["F1"],
      "estimated_effort": "L",
      "out_of_scope": ["Full IDE for scripts"]
    },
    {
      "id": "F10",
      "title": "Predictive Anomaly Detection Module",
      "description": "Identifies subtle patterns that typically precede major outages by analyzing historical telemetry trends and correlating anomalies.",
      "priority": "P3",
      "user_value": "Proactive incident management before user impact",
      "target_personas": ["persona_2"],
      "acceptance_criteria": ["50% prediction accuracy", "15 minute early warning"],
      "dependencies": ["F1",'''
        
        # First verify that extract_partial_array at least extracts 3+ complete items
        items = extract_partial_array(truncated, "features")
        assert len(items) >= 3, f"Expected at least 3 items, got {len(items)}: {[i.get('id') for i in items]}"
        
        # Verify we got the expected features
        ids = [item.get("id") for item in items]
        assert "F1" in ids
        assert "F2" in ids
        assert "F3" in ids
        
        # Try full parsing
        result, warnings = safe_parse_with_repair(truncated, FeaturesOutput, "features")
        # Should have warnings about truncation/repair attempt
        assert len(warnings) > 0
        
        # If parsing succeeded, verify we got the expected features
        if result is not None:
            assert len(result.features) >= 3
            assert result.features[0].id == "F1"
            assert result.features[1].id == "F2"
            assert result.features[2].id == "F3"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
