"""Core RICE analysis pipeline – _analyze_single_fiche, _fallback_extraction, analyze_files."""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from rice.models import (
    CompetenceProposition,
    DomaineProposition,
    EnseignantInfo,
    FicheEnseignantExtrait,
    RiceAnalysisResult,
    SavoirProposition,
    SousCompetenceProposition,
)
from rice.db import _fetch_all_enseignants_info
# LLM removed
_LLM_OK = False
from rice.nlp import (
    _bloom_to_niveau,
    _detect_bloom_level,
    _detect_type,
    _extract_acquis_apprentissage,
    _extract_metadata,
    _extract_referentiel_competences,
    _extract_seances,
    _extract_subcompetences,
    _extract_text,
    _build_domain_name_from_file,
    _llm_extract_subcompetences,
    _llm_fallback_items,
    _normalize,
    _slug,
    _RE_CHECKMARK,
    _RE_BULLET,
    _RE_NUMBERED,
)
from rice.enseignants import _match_enseignants_by_name, _match_enseignants_by_module
from rice.referential import (
    _match_gc_savoir,
    _gc_ref_niveau,
    _match_gc_competence,
    _suggest_gc_enseignants,
)

logger = logging.getLogger("rice_analyzer")


# Order used to compare canonical mastery levels.
_NIVEAU_ORDER = {
    "N1_DEBUTANT": 1,
    "N2_ELEMENTAIRE": 2,
    "N3_INTERMEDIAIRE": 3,
    "N4_AVANCE": 4,
    "N5_EXPERT": 5,
}


def _get_niveau_from_referentiel(
    savoir_code: str,
    departement: str = "gc",
    fallback_text: str = "",
) -> str:
    """
    Resolve official mastery level from referential data for DOC_REFERENTIEL.

    Search order:
      1) exact code match            (e.g. S3)
      2) code + 'a' fallback         (e.g. S1 -> S1a)
      3) all 1-letter suffix variants (e.g. S1a/S1b/S1c...) -> minimum level
      4) Bloom fallback on text
    """
    from rice.referential import _get_effective_referential

    ref = _get_effective_referential(departement)
    niveaux = ref.get("niveaux", {})

    if not niveaux:
        return _bloom_to_niveau(_detect_bloom_level(fallback_text))

    code = str(savoir_code or "").strip()
    if not code:
        return _bloom_to_niveau(_detect_bloom_level(fallback_text))

    # Match only strict 1-letter suffix variants (e.g. S6a, S6b, S6c),
    # excluding false positives like S60 or S61.
    variant_pattern = re.compile(r"^" + re.escape(code) + r"[a-z]$", re.IGNORECASE)
    variants = [
        val
        for k, val in niveaux.items()
        if variant_pattern.match(str(k).strip())
    ]
    if variants:
        return min(variants, key=lambda n: _NIVEAU_ORDER.get(n, 3))

    for k, val in niveaux.items():
        if str(k).strip().lower() == code.lower():
            return val

    code_a = f"{code}a"
    for k, val in niveaux.items():
        if str(k).strip().lower() == code_a.lower():
            return val

    niveau_bloom = _bloom_to_niveau(_detect_bloom_level(fallback_text))
    logger.debug(
        "  Niveau non trouve dans referentiel pour '%s' [%s] -> fallback Bloom: %s",
        code,
        departement,
        niveau_bloom,
    )
    return niveau_bloom


def _iter_comp_savoirs(comp: CompetenceProposition):
    for sc in (comp.sousCompetences or []):
        for s in (sc.savoirs or []):
            yield s
    for s in (comp.savoirs or []):
        yield s


# ─────────────────────────────────────────────────────────────────────────────
# Single-fiche analysis
# ─────────────────────────────────────────────────────────────────────────────

def _analyze_single_fiche(
    filename: str,
    text: str,
    enseignants: List[EnseignantInfo],
    departement: str = "gc",
    raw_tables: Optional[List] = None,
    use_module_prefix: bool = False,
) -> Tuple[DomaineProposition, List[FicheEnseignantExtrait]]:
    """
    Full NLP pipeline for one fiche module:
      1. Extract metadata (NER — table-based primary, regex fallback)
      2. Extract Acquis d'Apprentissage (Bloom taxonomy)
      3. Extract Séances (content chunking)
      4. Build competence tree
      5. Match enseignants (fuzzy name + module matching)
    """
    logger.info(f"Analyzing fiche: {filename} ({len(text)} chars) [dept={departement}]")

    # ── Step 1: Metadata extraction ──────────────────────────────────────
    meta = _extract_metadata(text, raw_tables=raw_tables)
    logger.info(f"  Metadata: {meta}")

    module_name = meta.get("nom_module")
    extracted_module_code = meta.get("code_module")
    module_code = extracted_module_code

    def _is_bad_domain_candidate(value: Optional[str]) -> bool:
        if not value:
            return True
        candidate = value.strip()
        if len(candidate) < 4:
            return True
        if re.match(r"^[A-Z][a-z0-9]{0,3}\d*\s*[-\u2013]\s+", candidate):
            return True
        if re.match(r"^[a-zà-ÿ]", candidate) or ("," in candidate and len(candidate) < 90):
            return True
        return False

    domain_candidates = [
        meta.get("nom_module"),
        meta.get("unite_enseignement"),
        meta.get("unite_pedagogique"),
    ]
    domain_name = next((c.strip() for c in domain_candidates if not _is_bad_domain_candidate(c)), None)
    if not domain_name:
        domain_name = _build_domain_name_from_file(filename) or "Domaine Général"

    if not module_name:
        module_name = domain_name
    if not module_code:
        module_code = _slug(module_name, 15)

    # Keep domain codes readable (e.g. GENIE-CIVIL instead of GENIE-CIVI).
    domain_code = extracted_module_code or _slug(domain_name, 15)

    # ── Step 2: Enseignant matching ──────────────────────────────────────
    fiche_ens_names = meta.get("enseignants_noms", [])
    roles_map = meta.get("enseignants_roles", {})
    if meta.get("responsable"):
        if meta["responsable"] not in fiche_ens_names:
            fiche_ens_names.append(meta["responsable"])
        roles_map.setdefault(meta["responsable"], "responsable")
    fiche_ens_names = list(dict.fromkeys(fiche_ens_names))  # dedupe preserving order

    matched_by_name, name_match_map = _match_enseignants_by_name(fiche_ens_names, enseignants)
    matched_by_module = _match_enseignants_by_module(text, enseignants)

    # Build extracted enseignant list – every name gets a real DB ID
    extracted_ens: List[FicheEnseignantExtrait] = []
    for name in fiche_ens_names:
        role = roles_map.get(name, "enseignant")
        match_info = name_match_map.get(name)
        if match_info:
            mid, mnom = match_info
        else:
            mid, mnom = None, None
        extracted_ens.append(FicheEnseignantExtrait(
            fichier=filename,
            nom_complet=name,
            role=role,
            matched_id=mid,
            matched_nom=mnom,
        ))
    logger.info(f"  Extracted professor names: {[e.nom_complet for e in extracted_ens]}")

    # ── Add referential & module-matched teachers (by ID) ────────────────
    all_ens_by_id: Dict[str, "EnseignantInfo"] = {str(e.id): e for e in enseignants}
    try:
        all_ens_by_id.update(_fetch_all_enseignants_info())
    except Exception:
        pass

    ref_savoir_matches = _match_gc_savoir(text, departement=departement)
    matched_by_ref = _suggest_gc_enseignants(ref_savoir_matches[:10])
    all_matched = list(set(matched_by_name + matched_by_module + matched_by_ref))

    already_extracted_ids = {ex.matched_id for ex in extracted_ens if ex.matched_id}
    for eid in all_matched:
        eid_str = str(eid)
        if eid_str in already_extracted_ids:
            continue
        ens_obj = all_ens_by_id.get(eid_str)
        if not ens_obj:
            continue
        full_name = f"{ens_obj.prenom} {ens_obj.nom}".strip() or eid_str
        extracted_ens.append(FicheEnseignantExtrait(
            fichier=filename,
            nom_complet=full_name,
            role="enseignant",
            matched_id=eid_str,
            matched_nom=full_name,
        ))
        already_extracted_ids.add(eid_str)

    logger.info(f"  Matched enseignants: {len(all_matched)} "
                f"(by name: {len(matched_by_name)}, by module: {len(matched_by_module)}, "
                f"by ref [{departement}]: {len(matched_by_ref)})")
    if ref_savoir_matches:
        logger.info(f"  Referential savoir matches [{departement}]: {ref_savoir_matches[:5]}")

    extracted_ids: List[str] = [e.matched_id for e in extracted_ens if e.matched_id]

    # ── Step 3: Extract Acquis d'Apprentissage ───────────────────────────
    acquis = _extract_acquis_apprentissage(text, raw_tables=raw_tables)
    logger.info(f"  Acquis d'apprentissage found: {len(acquis)}")

    # ── Step 4: Extract Séances ──────────────────────────────────────────
    seances = _extract_seances(text)
    logger.info(f"  Séances found: {len(seances)}")

    # ── Détection document référentiel (compétences sans AA/séances) ────
    referentiel_items = _extract_referentiel_competences(text)
    is_referentiel = (not acquis) and (not seances) and (len(referentiel_items) >= 3)
    if is_referentiel:
        logger.info(f"  Referential-format competencies found: {len(referentiel_items)}")

    # ── Step 5: Build competence tree ────────────────────────────────────
    competences: List[CompetenceProposition] = []
    comp_idx = 0

    # ── Step 5a: Extract explicit sub-competence titles ──────────────────
    subcomp_titles = _extract_subcompetences(text)
    # LLM subcomp extraction removed - use explicit titles only
    subcomp_titles = []
    if subcomp_titles:
        logger.info(f"  Sous-compétences explicites trouvées: {len(subcomp_titles)} — "
                     f"{[t for _, t in subcomp_titles[:5]]}")

    # === Compétence 1: from Acquis d'Apprentissage ===
    if acquis:
        comp_code = f"{module_code}-C{comp_idx + 1}"
        sous_comps: List[SousCompetenceProposition] = []
        sc_idx = 0

        if subcomp_titles:
            text_lines = text.splitlines()
            for idx_sc, (line_no, title) in enumerate(subcomp_titles):
                sc_code = f"{comp_code}-SC{sc_idx + 1}"
                start = line_no - 1
                end = (subcomp_titles[idx_sc + 1][0] - 1) if (idx_sc + 1 < len(subcomp_titles)) else len(text_lines)
                sc_block_text = "\n".join(text_lines[start:end])

                aa_block = [aa for aa in acquis if aa["text"] in sc_block_text]
                if not aa_block:
                    aa_block = acquis

                savoirs = []
                for j, aa in enumerate(aa_block):
                    aa_num = aa.get("id", j + 1)
                    sav_code = f"{comp_code}-AA{aa_num}"
                    gc_codes = _match_gc_savoir(aa["text"], departement=departement)
                    savoir_ens = list(
                        set(matched_by_name + matched_by_module + _suggest_gc_enseignants(gc_codes))
                    ) if gc_codes else list(set(matched_by_name + matched_by_module))
                    savoirs.append(SavoirProposition(
                        tmpId=str(uuid.uuid4()),
                        code=sav_code,
                        nom=aa["text"][:120],
                        description=aa["text"][:200],
                        type=_detect_type(aa["text"], departement),
                        niveau=_gc_ref_niveau(gc_codes, departement=departement) or _bloom_to_niveau(aa["bloom_level"]),
                        enseignantsSuggeres=savoir_ens or all_matched or extracted_ids,
                        refCodes=gc_codes,
                        competence_code=comp_code,
                        domaine_code=domain_code,
                        directToCompetence=False,
                    ))

                sc_gc = list({c for s in savoirs for c in s.refCodes})
                sous_comps.append(SousCompetenceProposition(
                    tmpId=str(uuid.uuid4()),
                    code=sc_code,
                    nom=title,
                    description=None,
                    refCodes=sc_gc,
                    savoirs=savoirs,
                ))
                sc_idx += 1
        else:
            savoirs_directs: List[SavoirProposition] = []
            for j, aa in enumerate(acquis):
                aa_num = aa.get("id", j + 1)
                sav_code = f"{comp_code}-AA{aa_num}"
                gc_codes = _match_gc_savoir(aa["text"], departement=departement)
                savoir_ens = list(
                    set(matched_by_name + matched_by_module + _suggest_gc_enseignants(gc_codes))
                ) if gc_codes else list(set(matched_by_name + matched_by_module))
                savoirs_directs.append(SavoirProposition(
                    tmpId=str(uuid.uuid4()),
                    code=sav_code,
                    nom=aa["text"][:120],
                    description=aa["text"][:200],
                    type=_detect_type(aa["text"], departement),
                    niveau=_gc_ref_niveau(gc_codes, departement=departement) or _bloom_to_niveau(aa["bloom_level"]),
                    enseignantsSuggeres=savoir_ens or all_matched or extracted_ids,
                    refCodes=gc_codes,
                    competence_code=comp_code,
                    domaine_code=domain_code,
                    directToCompetence=True,
                ))

        comp_gc = list({c for sc2 in sous_comps for c in sc2.refCodes})
        if not subcomp_titles:
            comp_gc.extend([c for s in savoirs_directs for c in s.refCodes])
        comp_gc = sorted(set(comp_gc))
        comp_gc_domaine = _match_gc_competence(" ".join(comp_gc), departement=departement) if comp_gc else None
        competences.append(CompetenceProposition(
            tmpId=str(uuid.uuid4()),
            code=comp_code,
            nom=f"Acquis d'apprentissage – {module_name}",
            description=meta.get("objectif"),
            ordre=comp_idx + 1,
            refCodes=comp_gc,
            refDomaine=comp_gc_domaine,
            savoirs=(savoirs_directs if not subcomp_titles else []),
            sousCompetences=sous_comps,
        ))
        comp_idx += 1

    # === Référentiel branch: grouped competencies (S/C/P/E/U/T...) ======
    if is_referentiel:
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for it in referentiel_items:
            grouped.setdefault(it["domaine_code"], []).append(it)

        used_comp_codes: set[str] = set()

        for dcode, group_items in grouped.items():
            native_code = str(dcode).strip().upper() or f"C{comp_idx + 1}"
            comp_code = native_code if native_code not in used_comp_codes else f"{native_code}{comp_idx + 1}"
            used_comp_codes.add(comp_code)
            domaine_nom = (group_items[0].get("domaine_nom") or dcode).strip()
            comp_name = domaine_nom if dcode.lower() in domaine_nom.lower() else f"{domaine_nom} ({dcode})"
            savoirs: List[SavoirProposition] = []
            for item in group_items:
                item_text = item["text"]
                gc_codes = _match_gc_savoir(item_text, departement=departement)
                savoir_ens = list(
                    set(matched_by_name + matched_by_module + _suggest_gc_enseignants(gc_codes))
                ) if gc_codes else list(set(matched_by_name + matched_by_module))

                savoirs.append(
                    SavoirProposition(
                        tmpId=str(uuid.uuid4()),
                        code=item["code"],
                        nom=item_text[:120],
                        description=None,
                        type=_detect_type(item_text, departement),
                        niveau=_get_niveau_from_referentiel(
                            savoir_code=item["code"],
                            departement=departement,
                            fallback_text=item_text,
                        ),
                        enseignantsSuggeres=savoir_ens or all_matched or extracted_ids,
                        refCodes=gc_codes,
                        competence_code=comp_code,
                        domaine_code=domain_code,
                        directToCompetence=True,
                    )
                )

            comp_gc = list({c for s in savoirs for c in s.refCodes})
            comp_gc_domaine = (
                _match_gc_competence(" ".join(comp_gc), departement=departement)
                if comp_gc
                else None
            )
            competences.append(
                CompetenceProposition(
                    tmpId=str(uuid.uuid4()),
                    code=comp_code,
                    nom=comp_name[:100],
                    description=None,
                    ordre=comp_idx + 1,
                    refCodes=comp_gc,
                    refDomaine=comp_gc_domaine,
                    savoirs=savoirs,
                    sousCompetences=[],
                )
            )
            comp_idx += 1

    # === Fallback: generic extraction if no AA/référentiel/séances found ===
    if not competences and not is_referentiel:
        competences = _fallback_extraction(text, module_code, module_name,
                                           all_matched or extracted_ids,
                                           departement=departement)

    all_ref_fiche = list({
        c
        for comp in competences
        for s in _iter_comp_savoirs(comp)
        for c in s.refCodes
    })
    domaine_ref_domaine = _match_gc_competence(text, departement=departement)
    if domaine_ref_domaine:
        logger.info(f"  Domain match [{departement}]: {domaine_ref_domaine} ({len(all_ref_fiche)} ref codes)")

    domaine = DomaineProposition(
        tmpId=str(uuid.uuid4()),
        code=domain_code,
        nom=domain_name,
        description=f"Domaine extrait de : {filename}" + (
            f" | Prérequis: {meta['prerequis']}" if meta.get("prerequis") else ""
        ),
        refCodes=all_ref_fiche,
        refDomaine=domaine_ref_domaine,
        competences=competences,
    )
    return domaine, extracted_ens


# ─────────────────────────────────────────────────────────────────────────────
# Fallback extraction
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_extraction(
    text: str,
    module_code: str,
    module_name: str,
    matched_ens: List[str],
    departement: str = "gc",
) -> List[CompetenceProposition]:
    """
    Fallback when structured sections (AA, Séances) are not found.

    Strategy:
    1. **LLM** (primary) — extracts action-verb competence phrases from any text.
    2. **Regex + Bloom filter** (fallback) — bullet extraction with verb validation.
    """
    items: List[str] = []

    # ── 0. LLM extraction (primary) ──────────────────────────────────────
    # LLM fallback removed - use regex bullets
    items = []

    # ── 1. Regex + Bloom filter (fallback when LLM unavailable/empty) ─────
    if not items:
        for pattern in [_RE_CHECKMARK, _RE_BULLET, _RE_NUMBERED]:
            items.extend(pattern.findall(text))
        items = [it.strip() for it in items if len(it.strip()) > 5]

        _FALLBACK_NOISE = re.compile(
            r"^(ce\s+(module|cours|ue)|l['\']objectif|les\s+(étudiants?|apprenants?)|"
            r"ce\s+cours\s+(est|comporte|comprend)|il\s+(est|s\'agit|faut)|"
            r"avoir|être|\d+\s*h)",
            re.IGNORECASE,
        )
        _FALLBACK_EXCLUSION = re.compile(
            r"^(comp[eé]tences?\s+dans|comp[eé]tence\s+en|"
            r"l['']ing[eé]nieur\s+gc\s+option|"
            r"du\s+b[aâ]timent|des\s+infrastructures|de\s+l['']am[eé]nagement|"
            r"axes?\s+forts|en\s+\d+e?\s+ann[eé]e|"
            r"objectifs?\s+et\s+d[eé]bouch[eé]s|"
            r"dimension\s+sp[eé]cifique)",
            re.IGNORECASE,
        )
        items = [it for it in items if not _FALLBACK_EXCLUSION.match(_normalize(it))]

        if not items:
            sentences = re.split(r"[.\n]+", text)
            items = [
                s.strip() for s in sentences
                if 10 < len(s.strip()) < 200
                and not re.match(r"^(Code|Mode|Evaluation|Référence)", s.strip())
                and not _FALLBACK_NOISE.match(s.strip())
                and not _FALLBACK_EXCLUSION.match(_normalize(s.strip()))
                and _detect_bloom_level(s.strip()) >= 2
            ]
            items = items[:20]

    if not items:
        items = [module_name]

    comp_code = f"{module_code}-C1"
    savoirs = []
    for j, item in enumerate(items[:25]):
        sav_code = f"{comp_code}-S{j + 1}"
        bloom = _detect_bloom_level(item)
        gc_codes = _match_gc_savoir(item, departement=departement)
        savoir_ens = list(set(matched_ens + _suggest_gc_enseignants(gc_codes))) if gc_codes else matched_ens
        savoirs.append(SavoirProposition(
            tmpId=str(uuid.uuid4()),
            code=sav_code,
            nom=item[:120],
            description=None,
            type=_detect_type(item, departement),
            niveau=_gc_ref_niveau(gc_codes, departement=departement) or _bloom_to_niveau(bloom),
            enseignantsSuggeres=savoir_ens,
            refCodes=gc_codes,
            competence_code=comp_code,
            directToCompetence=True,
        ))

    comp_gc = list({c for s in savoirs for c in s.refCodes})
    comp_gc_domaine = _match_gc_competence(" ".join(comp_gc), departement=departement) if comp_gc else None
    return [CompetenceProposition(
        tmpId=str(uuid.uuid4()),
        code=comp_code,
        nom=module_name,
        ordre=1,
        refCodes=comp_gc,
        refDomaine=comp_gc_domaine,
        savoirs=savoirs,
        sousCompetences=[],
    )]


# ─────────────────────────────────────────────────────────────────────────────
# Multi-file analysis entry point
# ─────────────────────────────────────────────────────────────────────────────

def analyze_files(
    filenames: List[str],
    file_contents: List[bytes],
    enseignants: List[EnseignantInfo],
    departement: str = "gc",
) -> RiceAnalysisResult:
    """Main analysis entry point – processes multiple fiche files.

    ``departement`` selects which referential is used for code matching:
    * ``"gc"``      – Génie Civil (built-in fallback + DB overrides)
    * ``"info"``    – Informatique (from DB ``ref_savoirs`` table)
    * ``"ge"``      – Génie Électrique (from DB)
    * ``"meca"``    – Génie Mécanique (from DB)
    * ``"telecom"`` – Télécommunications (from DB)
    * any other code – uses DB ``ref_savoirs`` rows filtered by that code
    """
    domaines: List[DomaineProposition] = []
    all_extracted_ens: List[FicheEnseignantExtrait] = []
    seen_codes: Dict[str, int] = {}

    multi = len(filenames) > 1
    for filename, data in zip(filenames, file_contents):
        text, raw_tables = _extract_text(filename, data)
        domaine, extracted_ens = _analyze_single_fiche(
            filename, text, enseignants,
            departement=departement,
            raw_tables=raw_tables,
            use_module_prefix=multi,
        )

        if domaine.code in seen_codes:
            seen_codes[domaine.code] += 1
            domaine.code = f"{domaine.code}{seen_codes[domaine.code]}"
        else:
            seen_codes[domaine.code] = 1

        domaines.append(domaine)
        all_extracted_ens.extend(extracted_ens)

    total_comp = sum(len(d.competences) for d in domaines)
    total_sc   = sum(len(c.sousCompetences)
                     for d in domaines for c in d.competences)
    total_sav  = sum(
        len(c.savoirs or []) + sum(len(sc.savoirs or []) for sc in (c.sousCompetences or []))
        for d in domaines
        for c in d.competences
    )
    assigned_ens = {
        eid
        for d in domaines for c in d.competences
        for s in _iter_comp_savoirs(c)
        for eid in s.enseignantsSuggeres
    }

    all_ref_codes_covered = sorted({
        c
        for d in domaines
        for comp in d.competences
        for s in _iter_comp_savoirs(comp)
        for c in s.refCodes
    })
    stats = {
        "departement": departement,
        "totalDomaines": len(domaines),
        "totalCompetences": total_comp,
        "totalSousCompetences": total_sc,
        "totalSavoirs": total_sav,
        "enseignantsCovered": len(assigned_ens),
        "tauxCouverture": round(len(assigned_ens) / max(len(enseignants), 1) * 100, 1),
        "refCodesCovered": all_ref_codes_covered,
        "refCodesCoveredCount": len(all_ref_codes_covered),
    }

    all_db_infos = _fetch_all_enseignants_info()
    found_ens_list = []
    for eid in assigned_ens:
        if eid in all_db_infos:
            found_ens_list.append(all_db_infos[eid])

    return RiceAnalysisResult(
        propositions=domaines,
        stats=stats,
        extractedEnseignants=all_extracted_ens,
        foundEnseignants=found_ens_list,
    )
