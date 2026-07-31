"""P0 startup validation tests — Phase 1 corrections.

These tests verify the service starts cleanly and critical bug fixes hold.
"""
import pytest


def test_main_module_imports_without_error():
    """P0-1: app.main must import without NameError/ImportError."""
    import app.main  # noqa: F401
    assert app.main.app is not None


def test_build_gap_factors_returns_list_for_strategic_gap():
    """P0-2: build_gap_factors must return list for strategic gaps."""
    from app.engines.gap_engine import build_gap_factors

    gap = {
        "knowledge_difficulty_level": 3,
        "gap_type": "GAP_STRATEGIC_COVERAGE",
        "is_strategic": True,
    }
    result = build_gap_factors(gap)
    assert isinstance(result, list), f"Expected list, got {type(result)}"
    assert len(result) > 0, "Strategic gap should have at least knowledge_difficulty factor"
    assert any(f["key"] == "strategic_impact" for f in result)


def test_build_gap_factors_returns_list_for_non_strategic_gap():
    """P0-3: build_gap_factors must return list for non-strategic gaps (bug fix)."""
    from app.engines.gap_engine import build_gap_factors

    gap = {
        "knowledge_difficulty_level": 2,
        "gap_type": "GAP_NOT_ASSIGNED",
        "is_strategic": False,
    }
    result = build_gap_factors(gap)
    assert isinstance(result, list), f"Expected list, got {type(result)}"
    assert len(result) > 0, "Non-strategic gap should have at least knowledge_difficulty factor"
    assert any(f["key"] == "knowledge_difficulty" for f in result)


def test_build_gap_factors_never_returns_none():
    """P0-4: build_gap_factors contract is list[dict] — never None."""
    from app.engines.gap_engine import build_gap_factors

    # Test with minimal gap
    result = build_gap_factors({"knowledge_difficulty_level": 1, "gap_type": "GAP_NOT_ASSIGNED"})
    assert result is not None, "build_gap_factors returned None — violates contract"
    assert isinstance(result, list)

    # Test with empty dict
    result = build_gap_factors({})
    assert result is not None
    assert isinstance(result, list)
