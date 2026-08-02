"""Cache service for teacher-specific data.

Provides cache invalidation functions that are isolated by teacher_id.
Cache keys include: teacher_id, data_version, model_version, snapshot_hash.

Functions:
- invalidate_teacher_cache(teacher_id)
- invalidate_teacher_recommendations(teacher_id)
- invalidate_teacher_risk(teacher_id)
- invalidate_teacher_gaps(teacher_id)
- invalidate_dashboard_scope(department_id=None, up_id=None)
"""

import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# In-memory cache stores (simulated)
_cache_stores: dict[str, dict[str, object]] = {
    "recommendations": {},
    "risk": {},
    "gaps": {},
    "predictions": {},
    "dashboard": {},
}


def _make_cache_key(
    teacher_id: str,
    data_version: str = "v1",
    model_version: str = "v1",
    snapshot_hash: str = "",
) -> str:
    """Create a cache key that includes all isolation components."""
    parts = [teacher_id, data_version, model_version, snapshot_hash]
    key_str = ":".join(str(p) for p in parts if p)
    return hashlib.sha256(key_str.encode()).hexdigest()[:32]


def get_cache_key(
    teacher_id: str,
    data_version: str = "v1",
    model_version: str = "v1",
    snapshot_hash: str = "",
) -> str:
    """Get a cache key for a teacher.

    The key includes:
    - teacher_id (required)
    - data_version (schema/data version)
    - model_version (ML model version)
    - snapshot_hash (data snapshot hash)
    """
    return _make_cache_key(teacher_id, data_version, model_version, snapshot_hash)


def invalidate_teacher_cache(teacher_id: str) -> int:
    """Invalidate ALL caches for a specific teacher.

    This is called when any data for the teacher changes.
    """
    count = 0
    for store_name, store in _cache_stores.items():
        if store_name == "dashboard":
            continue  # Dashboard is global, not teacher-specific
        keys_to_remove = [k for k, v in store.items() if teacher_id in str(v)]
        for k in keys_to_remove:
            del store[k]
            count += 1
    logger.info("Invalidated %d cache entries for teacher %s", count, teacher_id)
    return count


def invalidate_teacher_recommendations(teacher_id: str) -> int:
    """Invalidate recommendation caches for a specific teacher."""
    store = _cache_stores["recommendations"]
    keys_to_remove = [k for k, v in store.items() if teacher_id in str(v)]
    for k in keys_to_remove:
        del store[k]
    logger.info("Invalidated %d recommendation cache entries for teacher %s", len(keys_to_remove), teacher_id)
    return len(keys_to_remove)


def invalidate_teacher_risk(teacher_id: str) -> int:
    """Invalidate risk caches for a specific teacher."""
    store = _cache_stores["risk"]
    keys_to_remove = [k for k, v in store.items() if teacher_id in str(v)]
    for k in keys_to_remove:
        del store[k]
    logger.info("Invalidated %d risk cache entries for teacher %s", len(keys_to_remove), teacher_id)
    return len(keys_to_remove)


def invalidate_teacher_gaps(teacher_id: str) -> int:
    """Invalidate gap caches for a specific teacher."""
    store = _cache_stores["gaps"]
    keys_to_remove = [k for k, v in store.items() if teacher_id in str(v)]
    for k in keys_to_remove:
        del store[k]
    logger.info("Invalidated %d gap cache entries for teacher %s", len(keys_to_remove), teacher_id)
    return len(keys_to_remove)


def invalidate_dashboard_scope(
    department_id: Optional[str] = None,
    up_id: Optional[str] = None,
) -> int:
    """Invalidate dashboard caches for a department or UP scope.

    If both department_id and up_id are None, invalidates all dashboard caches.
    """
    store = _cache_stores["dashboard"]
    if department_id is None and up_id is None:
        count = len(store)
        store.clear()
        logger.info("Invalidated all %d dashboard cache entries", count)
        return count

    keys_to_remove = []
    for k, v in store.items():
        v_str = str(v)
        if (department_id and department_id in v_str) or (up_id and up_id in v_str):
            keys_to_remove.append(k)
    for k in keys_to_remove:
        del store[k]
    logger.info("Invalidated %d dashboard cache entries for scope dept=%s up=%s", len(keys_to_remove), department_id, up_id)
    return len(keys_to_remove)


def get_cache_stats() -> dict[str, int]:
    """Get cache statistics."""
    return {name: len(store) for name, store in _cache_stores.items()}


def clear_all_caches() -> int:
    """Clear all caches. Returns total entries cleared."""
    total = 0
    for store in _cache_stores.values():
        total += len(store)
        store.clear()
    return total
