"""Helper functions for the /validate endpoint, extracted to reduce Cognitive Complexity."""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

from rice.models import ValidateRequest, ValidateSummary


def _canonical_domain_token(value: Optional[str]) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _resolve_existing_domaine_code(cur, domaine) -> Optional[str]:
    """Return the canonical application-domain code if the imported fiche domain already exists.

    The RICE validation step must not create or overwrite official domain rows: it should
    only reuse domains that already exist in the application registry.
    """
    domaine_code = getattr(domaine, "code", None) or (domaine.get("code") if isinstance(domaine, dict) else None)
    domaine_nom = getattr(domaine, "nom", None) or (domaine.get("nom") if isinstance(domaine, dict) else None)
    if not domaine_code and not domaine_nom:
        return None

    tokens = []
    for value in (domaine_code, domaine_nom):
        if value:
            tokens.append(value)

    query = """
        SELECT code
        FROM domaines
        WHERE LOWER(code) = LOWER(%s)
           OR LOWER(nom) = LOWER(%s)
           OR regexp_replace(LOWER(code), '[^a-z0-9]+', '', 'g') = %s
           OR regexp_replace(LOWER(nom), '[^a-z0-9]+', '', 'g') = %s
        ORDER BY
           CASE
             WHEN LOWER(code) = LOWER(%s) THEN 0
             WHEN LOWER(nom) = LOWER(%s) THEN 1
             ELSE 2
           END,
           code
        LIMIT 1
    """
    lookup = list(dict.fromkeys([t for t in tokens if t]))
    if not lookup:
        return None

    search_values = [lookup[0], lookup[0], _canonical_domain_token(lookup[0]), _canonical_domain_token(lookup[0]), lookup[0], lookup[0]]
    if len(lookup) > 1:
        search_values[1] = lookup[1]
        search_values[4] = lookup[0]
        search_values[5] = lookup[0]

    cur.execute(query, tuple(search_values))
    row = cur.fetchone()
    return row[0] if row else None


# Reuse an existing application domain instead of creating/updating extracted fiche domains.
def _upsert_domaine(cur, domaine, errors: List[str], conn) -> bool:
    domaine_code = getattr(domaine, "code", None) or (domaine.get("code") if isinstance(domaine, dict) else "<inconnu>")
    try:
        domain_code = _resolve_existing_domaine_code(cur, domaine)
    except Exception as dom_err:
        # Une requête en échec avorte la transaction PostgreSQL : sans rollback,
        # les compétences et savoirs du même import échoueraient tous à leur tour.
        conn.rollback()
        errors.append(f"domaine {domaine_code}: {dom_err}")
        return False

    if domain_code:
        return True

    errors.append(
        f"domaine {domaine_code}: absent du référentiel applicatif, import RICE ignoré"
    )
    return False


# Insère ou met à jour une compétence, liée à son domaine (recherche par code).
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


# Insère ou met à jour une sous-compétence, liée à sa compétence parente.
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


# Crée les liens enseignant ↔ savoir (table enseignant_competences) pour
# chaque enseignant suggéré. Renvoie le nombre de liens insérés.
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


# Traite la validation d'une compétence : upsert de la compétence puis
# traitement de tous ses savoirs (directs + sous-compétences).
def _process_validate_competence(cur, competence, domaine_code: str, overwrite: bool, counts: Dict[str, int], errors: List[str], conn) -> None:
    if not _upsert_competence(cur, competence, domaine_code, errors, conn):
        return

    counts["upserted_competences"] += 1
    _process_competence_savoirs(cur, competence, overwrite, counts, errors, conn)


# Traite la validation d'un domaine : upsert du domaine puis de toutes
# ses compétences (récursif sur l'arbre).
def _process_validate_domaine(cur, domaine, overwrite: bool, counts: Dict[str, int], errors: List[str], conn) -> None:
    if not _upsert_domaine(cur, domaine, errors, conn):
        return

    counts["upserted_domaines"] += 1
    for competence in domaine.competences:
        _process_validate_competence(cur, competence, domaine.code, overwrite, counts, errors, conn)


# Parcourt TOUTES les propositions (domaines → compétences → savoirs) et
# renvoie les compteurs d'insert/update/link de la transaction /validate.
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


# Construit le résumé final de /validate : log des compteurs + objet
# ValidateSummary renvoyé au frontend (status ok, 30 premières erreurs max).
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
