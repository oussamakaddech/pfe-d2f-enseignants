"""Core RICE analysis pipeline – _analyze_single_fiche, _fallback_extraction, analyze_files."""

from __future__ import annotations

import logging
import re
import uuid
from pathlib import Path
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
from rice.llm import _LLM_OK
from rice.nlp import (
    _bloom_to_niveau,
    _detect_bloom_level,
    _detect_type,
    _extract_acquis_apprentissage,
    _extract_metadata,
    _extract_seances,
    _extract_subcompetences,
    _extract_text,
    _llm_extract_subcompetences,
    _llm_fallback_items,
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


# ─────────────────────────────────────────────────────────────────────────────
# Single-fiche analysis
# ─────────────────────────────────────────────────────────────────────────────

def _analyze_single_fiche(
    filename: str,
    text: str,
    enseignants: List[EnseignantInfo],
    departement: str = "gc",
    raw_tables: Optional[List] = None,
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

    domain_name = meta.get("unite_pedagogique")
    module_name = meta.get("nom_module")
    module_code = meta.get("code_module")

    if not domain_name:
        stem = Path(filename).stem
        clean = re.sub(r"^(fiche[_\s]?)?(ue[_\s]?|module[_\s]?|cours[_\s]?)?",
                       "", stem, flags=re.IGNORECASE)
        domain_name = re.sub(r"[_\-]+", " ", clean).strip().title() or "Domaine Général"

    if not module_name:
        module_name = domain_name
    if not module_code:
        module_code = _slug(module_name, 15)

    domain_code = _slug(domain_name, 10)

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
    acquis = _extract_acquis_apprentissage(text)
    logger.info(f"  Acquis d'apprentissage found: {len(acquis)}")

    # ── Step 4: Extract Séances ──────────────────────────────────────────
    seances = _extract_seances(text)
    logger.info(f"  Séances found: {len(seances)}")

    # ── Step 5: Build competence tree ────────────────────────────────────
    competences: List[CompetenceProposition] = []
    comp_idx = 0

    # ── Step 5a: Extract explicit sub-competence titles ──────────────────
    subcomp_titles = _extract_subcompetences(text)
    if not subcomp_titles:
        llm_titles = _llm_extract_subcompetences(text, module_name)
        if llm_titles:
            subcomp_titles = [(i + 1, t) for i, t in enumerate(llm_titles)]
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
                    sav_code = f"{sc_code}-S{j + 1}"
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
            groups: Dict[str, List[Dict]] = {
                "Connaissances fondamentales": [],
                "Compétences appliquées": [],
                "Compétences avancées": [],
            }
            for aa in acquis:
                bl = aa["bloom_level"]
                if bl <= 2:
                    groups["Connaissances fondamentales"].append(aa)
                elif bl <= 4:
                    groups["Compétences appliquées"].append(aa)
                else:
                    groups["Compétences avancées"].append(aa)

            for sc_name, aa_list in groups.items():
                if not aa_list:
                    continue
                sc_code = f"{comp_code}-SC{sc_idx + 1}"
                savoirs = []
                for j, aa in enumerate(aa_list):
                    sav_code = f"{sc_code}-S{j + 1}"
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
                    ))
                sc_gc = list({c for s in savoirs for c in s.refCodes})
                sous_comps.append(SousCompetenceProposition(
                    tmpId=str(uuid.uuid4()),
                    code=sc_code,
                    nom=sc_name,
                    description=None,
                    refCodes=sc_gc,
                    savoirs=savoirs,
                ))
                sc_idx += 1

        comp_gc = list({c for sc2 in sous_comps for c in sc2.refCodes})
        comp_gc_domaine = _match_gc_competence(" ".join(comp_gc), departement=departement) if comp_gc else None
        competences.append(CompetenceProposition(
            tmpId=str(uuid.uuid4()),
            code=comp_code,
            nom=f"Acquis d'apprentissage – {module_name}",
            description=meta.get("objectif"),
            ordre=comp_idx + 1,
            refCodes=comp_gc,
            refDomaine=comp_gc_domaine,
            sousCompetences=sous_comps,
        ))
        comp_idx += 1

    # === Compétence(s) from Séances (contenu détaillé) ===
    if seances:
        comp_code = f"{module_code}-C{comp_idx + 1}"
        sous_comps_seances: List[SousCompetenceProposition] = []

        for sc_idx, seance in enumerate(seances):
            sc_code = f"{comp_code}-SC{sc_idx + 1}"
            items = seance["items"]
            if not items:
                items = [seance["titre"]]

            savoirs = []
            for j, item in enumerate(items):
                sav_code = f"{sc_code}-S{j + 1}"
                bloom = _detect_bloom_level(item)
                item_type = _detect_type(item + " " + (seance.get("type_apprentissage") or ""), departement)
                gc_codes = _match_gc_savoir(item, departement=departement)
                savoir_ens = list(
                    set(matched_by_name + matched_by_module + _suggest_gc_enseignants(gc_codes))
                ) if gc_codes else list(set(matched_by_name + matched_by_module))
                savoirs.append(SavoirProposition(
                    tmpId=str(uuid.uuid4()),
                    code=sav_code,
                    nom=item[:120],
                    description=None,
                    type=item_type,
                    niveau=_gc_ref_niveau(gc_codes, departement=departement) or _bloom_to_niveau(bloom),
                    enseignantsSuggeres=savoir_ens or all_matched or extracted_ids,
                    refCodes=gc_codes,
                ))

            sc_titre = f"Séance {seance['numero']} : {seance['titre']}"
            if seance.get("duree"):
                sc_titre += f" ({seance['duree']})"

            sc_gc = list({c for s in savoirs for c in s.refCodes})
            sous_comps_seances.append(SousCompetenceProposition(
                tmpId=str(uuid.uuid4()),
                code=sc_code,
                nom=sc_titre[:100],
                description=seance.get("type_apprentissage"),
                refCodes=sc_gc,
                savoirs=savoirs,
            ))

        seance_gc = list({c for sc2 in sous_comps_seances for c in sc2.refCodes})
        seance_gc_domaine = _match_gc_competence(" ".join(seance_gc), departement=departement) if seance_gc else None
        competences.append(CompetenceProposition(
            tmpId=str(uuid.uuid4()),
            code=comp_code,
            nom=f"Contenu détaillé – {module_name}",
            description=None,
            ordre=comp_idx + 1,
            refCodes=seance_gc,
            refDomaine=seance_gc_domaine,
            sousCompetences=sous_comps_seances,
        ))
        comp_idx += 1

    # === Fallback: generic extraction if no AA and no séances found ===
    if not competences:
        competences = _fallback_extraction(text, module_code, module_name,
                                           all_matched or extracted_ids,
                                           departement=departement)

    all_ref_fiche = list({
        c
        for comp in competences
        for sc2 in comp.sousCompetences
        for s in sc2.savoirs
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
    if _LLM_OK:
        items = _llm_fallback_items(text, module_name)

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

        if not items:
            sentences = re.split(r"[.\n]+", text)
            items = [
                s.strip() for s in sentences
                if 10 < len(s.strip()) < 200
                and not re.match(r"^(Code|Mode|Evaluation|Référence)", s.strip())
                and not _FALLBACK_NOISE.match(s.strip())
                and _detect_bloom_level(s.strip()) >= 2
            ]
            items = items[:20]

    if not items:
        items = [module_name]

    comp_code = f"{module_code}-C1"
    sc_code = f"{comp_code}-SC1"

    savoirs = []
    for j, item in enumerate(items[:25]):
        sav_code = f"{sc_code}-S{j + 1}"
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
        ))

    sc_gc = list({c for s in savoirs for c in s.refCodes})
    sc = SousCompetenceProposition(
        tmpId=str(uuid.uuid4()),
        code=sc_code,
        nom="Contenus extraits",
        refCodes=sc_gc,
        savoirs=savoirs,
    )

    comp_gc = list({c for s in savoirs for c in s.refCodes})
    comp_gc_domaine = _match_gc_competence(" ".join(comp_gc), departement=departement) if comp_gc else None
    return [CompetenceProposition(
        tmpId=str(uuid.uuid4()),
        code=comp_code,
        nom=module_name,
        ordre=1,
        refCodes=comp_gc,
        refDomaine=comp_gc_domaine,
        sousCompetences=[sc],
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

    for filename, data in zip(filenames, file_contents):
        text, raw_tables = _extract_text(filename, data)
        domaine, extracted_ens = _analyze_single_fiche(
            filename, text, enseignants,
            departement=departement,
            raw_tables=raw_tables,
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
    total_sav  = sum(len(sc.savoirs)
                     for d in domaines for c in d.competences
                     for sc in c.sousCompetences)
    assigned_ens = {
        eid
        for d in domaines for c in d.competences
        for sc in c.sousCompetences for s in sc.savoirs
        for eid in s.enseignantsSuggeres
    }

    all_ref_codes_covered = sorted({
        c
        for d in domaines
        for comp in d.competences
        for sc in comp.sousCompetences
        for s in sc.savoirs
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
