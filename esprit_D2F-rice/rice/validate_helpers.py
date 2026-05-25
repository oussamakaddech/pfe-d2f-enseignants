"""Helper functions for the /validate endpoint, extracted to reduce Cognitive Complexity."""

from __future__ import annotations

from typing import Dict, List, Tuple

from rice.models import ValidateRequest, ValidateSummary


def _upsert_domaine(cur, domaine, errors: List[str], conn) -> bool:
    try:
        cur.execute("""
            INSERT INTO domaines (code, nom, description, actif)
            VALUES (%s, %s, %s, true)
            ON CONFLICT (code) DO UPDATE SET
                nom         = EXCLUDED.nom,
                description = EXCLUDED.description
        """, (
            domaine.code[:50],
            domaine.nom[:255],
            (domaine.description or "")[:500],
        ))
        return True
    except Exception as dom_err:
        conn.rollback()
        errors.append(f"domaine {domaine.code}: {dom_err}")
        return False


def _upsert_competence(cur, competence, domaine_code: str, errors: List[str], conn) -> bool:
    try:
        cur.execute("""
            INSERT INTO competences
                (code, nom, description, ordre, domaine_id)
            VALUES (
                %s, %s, %s, %s,
                (SELECT id FROM domaines WHERE code = %s)
            )
            ON CONFLICT (code) DO UPDATE SET
                nom        = EXCLUDED.nom,
                description = EXCLUDED.description,
                ordre      = EXCLUDED.ordre,
                domaine_id = EXCLUDED.domaine_id
        """, (
            competence.code[:50],
            competence.nom[:255],
            (competence.description or "")[:500],
            competence.ordre,
            domaine_code[:50],
        ))
        return True
    except Exception as comp_err:
        conn.rollback()
        errors.append(f"competence {competence.code}: {comp_err}")
        return False


def _upsert_sous_competence(cur, sc, competence_code: str, errors: List[str], conn) -> bool:
    try:
        cur.execute("""
            INSERT INTO sous_competences
                (code, nom, description, competence_id)
            VALUES (
                %s, %s, %s,
                (SELECT id FROM competences WHERE code = %s)
            )
            ON CONFLICT (code) DO UPDATE SET
                nom          = EXCLUDED.nom,
                description  = EXCLUDED.description,
                competence_id = EXCLUDED.competence_id
        """, (
            sc.code[:50],
            sc.nom[:255],
            (sc.description or "")[:500],
            competence_code[:50],
        ))
        return True
    except Exception as sc_err:
        conn.rollback()
        errors.append(f"sous_competence {sc.code}: {sc_err}")
        return False


def _insert_savoir_links(cur, savoir, sav_id: str, errors: List[str], conn) -> int:
    lnk = 0
    for ens_id in savoir.enseignantsSuggeres:
        try:
            cur.execute("""
                INSERT INTO enseignant_competences
                    (enseignant_id, savoir_id, niveau, date_acquisition)
                VALUES (%s, %s, %s, CURRENT_DATE)
                ON CONFLICT DO NOTHING
            """, (ens_id, sav_id, savoir.niveau))
            lnk += 1
        except Exception as link_err:
            conn.rollback()
            errors.append(f"link {ens_id}->{savoir.code}: {link_err}")
    return lnk


def _upsert_savoir_row(cur, savoir, parent_code: str, overwrite: bool,
                       errors: List[str], conn,
                       parent_type: str = "competence") -> Tuple[int, int, int]:
    """Insert/update a savoir linked to competence or sous_competence."""
    sav_id = savoir.tmpId
    if parent_type == "sous_competence":
        insert_sql = """
            INSERT INTO savoirs
                    (id, code, nom, description, type, niveau,
                     sous_competence_id, competence_id)
            VALUES (
                %s, %s, %s, %s, %s, %s,
                    (SELECT id FROM sous_competences WHERE code = %s),
                    NULL
            )
            ON CONFLICT (id) DO UPDATE SET
                code               = EXCLUDED.code,
                nom                = EXCLUDED.nom,
                description        = EXCLUDED.description,
                type               = EXCLUDED.type,
                niveau             = EXCLUDED.niveau,
                    sous_competence_id = EXCLUDED.sous_competence_id,
                    competence_id      = NULL
            RETURNING (xmax = 0) AS inserted
        """
    else:
        insert_sql = """
            INSERT INTO savoirs
                    (id, code, nom, description, type, niveau,
                     sous_competence_id, competence_id)
            VALUES (
                %s, %s, %s, %s, %s, %s,
                    NULL,
                    (SELECT id FROM competences WHERE code = %s)
            )
            ON CONFLICT (id) DO UPDATE SET
                code               = EXCLUDED.code,
                nom                = EXCLUDED.nom,
                description        = EXCLUDED.description,
                type               = EXCLUDED.type,
                niveau             = EXCLUDED.niveau,
                sous_competence_id = NULL,
                competence_id      = EXCLUDED.competence_id
            RETURNING (xmax = 0) AS inserted
        """
    try:
        cur.execute(insert_sql, (
            sav_id, savoir.code[:50], savoir.nom[:255],
            (savoir.description or "")[:500],
            savoir.type, savoir.niveau, parent_code[:50],
        ))
        row = cur.fetchone()
        ins = 1 if (row and row[0]) else 0
    except Exception as sav_err:
        conn.rollback()
        errors.append(f"savoir {savoir.code}: {sav_err}")
        return (0, 0, 0)

    if overwrite:
        try:
            cur.execute(
                "DELETE FROM enseignant_competences WHERE savoir_id = %s",
                (sav_id,),
            )
        except Exception:
            conn.rollback()

    lnk = _insert_savoir_links(cur, savoir, sav_id, errors, conn)
    return (ins, 1 - ins, lnk)


def _process_competence_savoirs(cur, competence, overwrite: bool, counts: Dict[str, int], errors: List[str], conn) -> None:
    """Insert/update all savoirs (direct + sous-competence) for one competence."""
    for savoir in (competence.savoirs or []):
        ins, upd, lnk = _upsert_savoir_row(
            cur, savoir, competence.code, overwrite, errors, conn,
            parent_type="competence",
        )
        counts["inserted_savoirs"] += ins
        counts["updated_savoirs"] += upd
        counts["inserted_links"] += lnk

    for sc in competence.sousCompetences:
        if not _upsert_sous_competence(cur, sc, competence.code, errors, conn):
            continue
        counts["upserted_sous_competences"] += 1

        for savoir in sc.savoirs:
            ins, upd, lnk = _upsert_savoir_row(
                cur, savoir, sc.code, overwrite, errors, conn,
                parent_type="sous_competence",
            )
            counts["inserted_savoirs"] += ins
            counts["updated_savoirs"] += upd
            counts["inserted_links"] += lnk


def _process_validate_competence(cur, competence, domaine_code: str, overwrite: bool, counts: Dict[str, int], errors: List[str], conn) -> None:
    if not _upsert_competence(cur, competence, domaine_code, errors, conn):
        return

    counts["upserted_competences"] += 1
    _process_competence_savoirs(cur, competence, overwrite, counts, errors, conn)


def _process_validate_domaine(cur, domaine, overwrite: bool, counts: Dict[str, int], errors: List[str], conn) -> None:
    if not _upsert_domaine(cur, domaine, errors, conn):
        return

    counts["upserted_domaines"] += 1
    for competence in domaine.competences:
        _process_validate_competence(cur, competence, domaine.code, overwrite, counts, errors, conn)


def _process_validate_propositions(cur, request: ValidateRequest, errors: List[str], conn) -> Dict[str, int]:
    counts = {
        "upserted_domaines": 0,
        "upserted_competences": 0,
        "upserted_sous_competences": 0,
        "inserted_savoirs": 0,
        "updated_savoirs": 0,
        "inserted_links": 0,
    }
    for domaine in request.propositions:
        _process_validate_domaine(cur, domaine, request.overwrite, counts, errors, conn)
    return counts


def _build_validate_summary(counts: Dict[str, int], errors: List[str], logger) -> ValidateSummary:
    logger.info(
        f"Validate: domaines={counts['upserted_domaines']} competences={counts['upserted_competences']} "
        f"sous_competences={counts['upserted_sous_competences']} "
        f"inserted={counts['inserted_savoirs']} updated={counts['updated_savoirs']} "
        f"links={counts['inserted_links']} errors={len(errors)}"
    )
    return ValidateSummary(
        status="ok",
        upserted_domaines=counts["upserted_domaines"],
        upserted_competences=counts["upserted_competences"],
        upserted_sous_competences=counts["upserted_sous_competences"],
        inserted_savoirs=counts["inserted_savoirs"],
        updated_savoirs=counts["updated_savoirs"],
        inserted_enseignant_links=counts["inserted_links"],
        errors=errors[:30],
    )
