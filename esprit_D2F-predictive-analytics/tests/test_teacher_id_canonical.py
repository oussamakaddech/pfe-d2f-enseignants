"""Phase 2 — Canonical teacher ID tests.

ENSxxx is the only canonical format. Legacy Txxx requires VERIFIED DB mapping.
No silent positional fallback allowed.
"""
import os
import pytest
from unittest.mock import MagicMock

os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")
os.environ.setdefault("JWT_SECRET", "test-secret-" + "x" * 40)


class TestCanonicalValidation:
    def test_validate_canonical_teacher_id_accepts_ens(self):
        from app.utils.teacher_id_normalizer import validate_canonical_teacher_id
        assert validate_canonical_teacher_id("ENS001") is True
        assert validate_canonical_teacher_id("ens002") is True  # case-insensitive
        assert validate_canonical_teacher_id("  ENS030  ") is True  # strips spaces

    def test_validate_canonical_teacher_id_rejects_legacy(self):
        from app.utils.teacher_id_normalizer import validate_canonical_teacher_id
        assert validate_canonical_teacher_id("T001") is False
        assert validate_canonical_teacher_id("T030") is False

    def test_validate_canonical_teacher_id_rejects_invalid(self):
        from app.utils.teacher_id_normalizer import validate_canonical_teacher_id
        assert validate_canonical_teacher_id("XXX001") is False
        assert validate_canonical_teacher_id("ENS") is False
        assert validate_canonical_teacher_id("") is False
        assert validate_canonical_teacher_id(None) is False

    def test_normalize_accepts_canonical_passthrough(self):
        from app.utils.teacher_id_normalizer import normalize_teacher_id
        assert normalize_teacher_id("ENS001") == "ENS001"
        assert normalize_teacher_id("ens002") == "ENS002"


class TestLegacyResolution:
    def test_unknown_legacy_id_is_rejected(self):
        """Unmapped legacy ID → ValueError, NOT silent positional fallback."""
        from app.utils.teacher_id_normalizer import normalize_teacher_id
        with pytest.raises(ValueError, match="Unmapped legacy teacher ID"):
            normalize_teacher_id("T999", db=None)

    def test_resolve_legacy_teacher_id_returns_none_for_unknown(self):
        from app.utils.teacher_id_normalizer import resolve_legacy_teacher_id
        db = MagicMock()
        db.query.return_value.filter_by.return_value.first.return_value = None
        assert resolve_legacy_teacher_id("T999", db) is None

    def test_resolve_legacy_teacher_id_with_verified_mapping(self):
        from app.utils.teacher_id_normalizer import resolve_legacy_teacher_id
        db = MagicMock()
        m = MagicMock()
        m.canonical_id = "ENS005"
        db.query.return_value.filter_by.return_value.first.return_value = m
        assert resolve_legacy_teacher_id("T005", db) == "ENS005"

    def test_resolve_legacy_rejects_unverified_mapping(self):
        """Mapping exists but PENDING → normalize_teacher_id raises."""
        from app.utils.teacher_id_normalizer import normalize_teacher_id
        db = MagicMock()
        m = MagicMock()
        m.verified = "PENDING"
        db.query.return_value.filter_by.return_value.first.return_value = m
        with pytest.raises(ValueError, match="not VERIFIED"):
            normalize_teacher_id("T005", db)


class TestCacheKeyCanonical:
    def test_prediction_cache_key_uses_teacher_id_as_given(self):
        """The cache stores whatever key is given; callers must normalize first.
        We verify normalizing before caching gives canonical key."""
        from app.ml.gap_predictor import PredictionCache
        from app.utils.teacher_id_normalizer import normalize_teacher_id

        cache = PredictionCache(ttl_seconds=60)
        canonical = normalize_teacher_id("ENS002")
        cache.set(canonical, 10, {"gaps": []})
        assert cache.get("ENS002", 10) == {"gaps": []}
        # A differently-cased key would miss — keys are exact strings, so
        # normalization must happen BEFORE cache access.
        assert cache.get("ens002", 10) is None


class TestOutputsEnsOnly:
    def test_gap_diagnostic_response_uses_ens(self):
        from app.engines.predictive_gap_diagnostic import diagnose_gap, GAP_NOT_ASSIGNED
        d = diagnose_gap(
            teacher_id="ENS002", knowledge_id="K001", knowledge_name="Algo",
            knowledge_difficulty_level=3, gap_type=GAP_NOT_ASSIGNED,
        )
        out = d.to_dict()
        assert out["teacher_id"].startswith("ENS")
        assert not out["teacher_id"].startswith("T0")

    def test_denormalize_returns_none_without_verified_mapping(self):
        from app.utils.teacher_id_normalizer import denormalize_to_legacy
        db = MagicMock()
        db.query.return_value.filter_by.return_value.first.return_value = None
        # No silent positional fallback to "T002"
        assert denormalize_to_legacy("ENS002", db) is None
