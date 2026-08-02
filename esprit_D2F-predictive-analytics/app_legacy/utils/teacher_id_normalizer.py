"""Teacher ID normalization utilities.

Canonical format: ENS001..ENS030 (from PostgreSQL enseignants.id)
Legacy format: T001..T030 (from master CSV dataset)

All external inputs normalized to canonical at API boundary.
All internal processing uses canonical.
All outputs return canonical (with optional legacy mapping).
"""

import re
import logging
from functools import lru_cache
from typing import Optional

from sqlalchemy.orm import Session

from app.models.db_models import TeacherIdMapping

logger = logging.getLogger(__name__)

# Canonical format: ENS followed by 3 digits
CANONICAL_PATTERN = re.compile(r"^ENS\d{3}$", re.IGNORECASE)
# Legacy format: T followed by 3 digits
LEGACY_PATTERN = re.compile(r"^T\d{3}$", re.IGNORECASE)


def is_canonical_id(teacher_id: str) -> bool:
    """Check if teacher_id is in canonical ENS format."""
    return bool(CANONICAL_PATTERN.match(teacher_id.upper()))


def is_legacy_id(teacher_id: str) -> bool:
    """Check if teacher_id is in legacy T format."""
    return bool(LEGACY_PATTERN.match(teacher_id.upper()))


def normalize_teacher_id(teacher_id: str, db: Optional[Session] = None) -> str:
    """Normalize any teacher_id format to canonical ENS format.
    
    Args:
        teacher_id: Input ID (ENS001, T001, ens001, t001, etc.)
        db: Optional DB session to lookup mapping table
    
    Returns:
        Canonical ENS format ID
    
    Raises:
        ValueError: If ID format is unknown and not found in mapping
    """
    if not teacher_id:
        raise ValueError("Empty teacher_id")
    
    tid = teacher_id.strip().upper()
    
    # Already canonical
    if is_canonical_id(tid):
        return tid
    
    # Legacy format - try mapping table.
    # P2 — NO silent positional fallback: an unmapped legacy ID is an explicit
    # error (CDC Phase 2: "Aucun fallback positionnel silencieux n'est autorisé").
    if is_legacy_id(tid):
        if db:
            mapping = db.query(TeacherIdMapping).filter_by(legacy_id=tid).first()
            if mapping and mapping.verified == "VERIFIED":
                return mapping.canonical_id
            if mapping:
                raise ValueError(
                    f"Legacy teacher ID '{tid}' mapping exists but is not VERIFIED "
                    f"(status={mapping.verified}). Resolve mapping before use."
                )
        raise ValueError(
            f"Unmapped legacy teacher ID: '{tid}'. "
            "Provide a DB session with a verified teacher_id_mapping row, "
            "or use the canonical ENS format directly."
        )
    
    # Unknown format
    raise ValueError(f"Unknown teacher_id format: {teacher_id}. Expected ENS### or T###")


def denormalize_to_legacy(canonical_id: str, db: Optional[Session] = None) -> Optional[str]:
    """Convert canonical ID to legacy format for CSV export compatibility.

    Returns None if no VERIFIED mapping exists — a guessed positional fallback
    is forbidden (CDC Phase 2)."""
    if not canonical_id:
        return None

    cid = canonical_id.strip().upper()
    if not is_canonical_id(cid):
        return None

    if db:
        mapping = db.query(TeacherIdMapping).filter_by(canonical_id=cid, verified="VERIFIED").first()
        if mapping:
            return mapping.legacy_id

    return None


def validate_canonical_teacher_id(teacher_id: str) -> bool:
    """Return True only if the ID is a strict canonical ENSxxx ID.

    CDC Phase 2 — this is the ONLY format accepted by modern APIs.
    """
    if not teacher_id:
        return False
    return is_canonical_id(teacher_id.strip())


def resolve_legacy_teacher_id(teacher_id: str, db: Session) -> Optional[str]:
    """Resolve a legacy T-format ID to canonical ENS via the mapping table.

    Returns the canonical ENS ID if a VERIFIED mapping exists, else None.
    No positional guessing.
    """
    if not teacher_id:
        return None
    tid = teacher_id.strip().upper()
    if is_canonical_id(tid):
        return tid
    if is_legacy_id(tid):
        mapping = db.query(TeacherIdMapping).filter_by(legacy_id=tid, verified="VERIFIED").first()
        return mapping.canonical_id if mapping else None
    return None


def validate_teacher_id(teacher_id: str, db: Optional[Session] = None) -> str:
    """Validate and normalize teacher_id at API boundary.
    
    Rejects mixed/unknown formats. Returns canonical ID.
    """
    normalized = normalize_teacher_id(teacher_id, db)
    
    # Verify exists in DB if session provided
    if db:
        from app.models.db_models import SkillGap
        exists = db.query(SkillGap).filter_by(enseignant_id=normalized).first()
        if not exists:
            # Check teacher table via raw SQL
            from app.core.db import execute_query
            rows = execute_query(db, "SELECT 1 FROM enseignants WHERE id = :id", {"id": normalized})
            if not rows:
                logger.warning("Teacher ID %s not found in DB", normalized)
                # Don't raise - might be new teacher
    
    return normalized


@lru_cache(maxsize=128)
def get_legacy_mapping(db: Session) -> dict[str, str]:
    """Load canonical->legacy mapping from DB (cached)."""
    mappings = db.query(TeacherIdMapping).all()
    return {m.canonical_id: m.legacy_id for m in mappings}


def populate_initial_mapping(db: Session) -> int:
    """Populate teacher_id_mapping from positional alignment.
    
    Assumes DB enseignants and CSV teachers.csv are in same order.
    Run once during migration.
    """
    from app.core.db import execute_query
    import csv
    from pathlib import Path
    
    # Get DB teachers in order
    db_teachers = execute_query(db, "SELECT id FROM enseignants WHERE deleted_at IS NULL ORDER BY id")
    db_ids = [row["id"] for row in db_teachers]
    
    # Get CSV teachers in order
    csv_path = Path(__file__).parent.parent.parent / "data" / "clean" / "teachers.csv"
    csv_ids = []
    if csv_path.exists():
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                csv_ids.append(row["teacher_id"])
    
    if len(db_ids) != len(csv_ids):
        logger.warning("DB teacher count (%d) != CSV teacher count (%d)", len(db_ids), len(csv_ids))
    
    count = 0
    for db_id, csv_id in zip(db_ids, csv_ids):
        if db_id and csv_id:
            mapping = TeacherIdMapping(
                canonical_id=db_id.upper(),
                legacy_id=csv_id.upper(),
                source="positional_migration",
                verified="PENDING"
            )
            db.merge(mapping)
            count += 1
    
    db.commit()
    logger.info("Populated %d teacher ID mappings", count)
    return count