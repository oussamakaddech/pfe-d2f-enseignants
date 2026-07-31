"""Populer la table teacher_id_mapping à partir des données existantes dans la DB.

Lire tous les enseignants, résoudre les mappings Txxx → ENSxxx positionnement.
Marquer les mappings comme VERIFIED pour ceux qui existent réellement dans la DB.
"""

import csv
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.db import db_session
from app.models.db_models import TeacherIdMapping

def populate_mapping():
    with db_session() as db:
        # Get all enseignants from DB
        from sqlalchemy import text
        result = db.execute(text("SELECT id FROM enseignants WHERE deleted_at IS NULL ORDER BY id")).fetchall()
        db_ids = {r[0].upper() for r in result}
        
        # Read CSV teachers
        csv_path = Path(__file__).parent.parent / "data" / "clean" / "teachers.csv"
        csv_ids = []
        if csv_path.exists():
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    csv_ids.append(row["teacher_id"].upper() if row["teacher_id"] else None)
        
        # Only keep valid Txxx ids and sort them positionally
        csv_ids = [cid for cid in csv_ids if cid and cid.startswith("T")]
        csv_ids.sort()
        
        count = 0
        for i, db_id in enumerate(sorted(db_ids)):
            if i < len(csv_ids):
                legacy_id = csv_ids[i]
                # Check if mapping exists
                existing = db.query(TeacherIdMapping).filter_by(canonical_id=db_id).first()
                if not existing:
                    mapping = TeacherIdMapping(
                        canonical_id=db_id,
                        legacy_id=legacy_id,
                        source="positional_migration",
                        verified="VERIFIED"  # Verified by position
                    )
                    db.add(mapping)
                    count += 1
        
        db.commit()
        print(f"Added {count} teacher ID mappings")

if __name__ == "__main__":
    populate_mapping()