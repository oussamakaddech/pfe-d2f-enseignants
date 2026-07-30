"""Database migration: Add teacher_id_mapping table for canonical ID normalization."""

from sqlalchemy import (
    Column, String, DateTime, UniqueConstraint, Index, text
)
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass


class TeacherIdMapping(Base):
    """Canonical teacher ID mapping table.
    
    DB (enseignants.id) uses ENS001..ENS030 format.
    Legacy CSV/master dataset uses T001..T030 format.
    This table provides explicit, auditable mapping.
    """
    __tablename__ = "teacher_id_mapping"
    
    canonical_id = Column(String(36), primary_key=True, comment="ENS format from DB")
    legacy_id = Column(String(36), nullable=False, unique=True, comment="T format from CSV")
    source = Column(String(50), nullable=False, comment="Origin: 'db', 'csv', 'manual'")
    verified = Column(String(10), nullable=False, default="PENDING", comment="VERIFIED|PENDING|REJECTED")
    verified_by = Column(String(36), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("ix_teacher_id_mapping_legacy", "legacy_id"),
        UniqueConstraint("canonical_id", "legacy_id", name="uq_canonical_legacy"),
    )