"""
tests/test_cache.py — Unit tests for rice.cache (ThreadSafeCache + env validation).
"""
import sys
import os
import time
import threading
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice.cache import _ThreadSafeCache, _validate_env


# ── _ThreadSafeCache ────────────────────────────────────────────────────────

class TestThreadSafeCache:
    def test_set_and_get(self):
        cache = _ThreadSafeCache()
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

    def test_get_missing_key_returns_none(self):
        cache = _ThreadSafeCache()
        assert cache.get("nonexistent") is None

    def test_get_with_ttl_fresh(self):
        cache = _ThreadSafeCache()
        cache.set("key1", "value1")
        # Should still be fresh with a 10-second TTL
        assert cache.get("key1", ttl=10) == "value1"

    def test_get_with_ttl_expired(self):
        cache = _ThreadSafeCache()
        cache.set("key1", "value1")
        # Manually backdate the timestamp
        cache._ts["key1"] = time.time() - 100
        assert cache.get("key1", ttl=5) is None

    def test_get_with_zero_ttl_ignores_ttl(self):
        cache = _ThreadSafeCache()
        cache.set("key1", "value1")
        # Backdate but ttl=0 means no TTL check
        cache._ts["key1"] = time.time() - 1000
        assert cache.get("key1", ttl=0) == "value1"

    def test_pop_removes_key(self):
        cache = _ThreadSafeCache()
        cache.set("key1", "value1")
        cache.pop("key1")
        assert cache.get("key1") is None

    def test_pop_nonexistent_key_no_error(self):
        cache = _ThreadSafeCache()
        cache.pop("nonexistent")  # should not raise

    def test_clear_removes_all(self):
        cache = _ThreadSafeCache()
        cache.set("a", 1)
        cache.set("b", 2)
        cache.clear()
        assert cache.get("a") is None
        assert cache.get("b") is None

    def test_keys_returns_all_keys(self):
        cache = _ThreadSafeCache()
        cache.set("x", 10)
        cache.set("y", 20)
        assert sorted(cache.keys()) == ["x", "y"]

    def test_keys_empty_cache(self):
        cache = _ThreadSafeCache()
        assert cache.keys() == []

    def test_bool_true_when_data(self):
        cache = _ThreadSafeCache()
        cache.set("k", "v")
        assert bool(cache) is True

    def test_bool_false_when_empty(self):
        cache = _ThreadSafeCache()
        assert bool(cache) is False

    def test_overwrite_existing_key(self):
        cache = _ThreadSafeCache()
        cache.set("key1", "old")
        cache.set("key1", "new")
        assert cache.get("key1") == "new"

    def test_various_value_types(self):
        cache = _ThreadSafeCache()
        cache.set("int_val", 42)
        cache.set("list_val", [1, 2, 3])
        cache.set("dict_val", {"a": 1})
        cache.set("none_val", None)
        assert cache.get("int_val") == 42
        assert cache.get("list_val") == [1, 2, 3]
        assert cache.get("dict_val") == {"a": 1}
        assert cache.get("none_val") is None

    def test_thread_safety_concurrent_access(self):
        cache = _ThreadSafeCache()
        errors = []

        def writer(start, count):
            try:
                for i in range(start, start + count):
                    cache.set(f"key_{i}", i)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=writer, args=(i * 100, 100)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        # All 1000 keys should be present
        assert len(cache.keys()) == 1000


# ── _validate_env ───────────────────────────────────────────────────────────

class TestValidateEnv:
    def test_validate_env_runs_without_error(self):
        # Should not raise even when env vars are missing
        _validate_env()
