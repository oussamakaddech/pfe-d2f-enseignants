"""Fuzzy enseignant name / module matching."""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Tuple

from rice.models import EnseignantInfo
from rice.nlp import _normalize, _FUZZY_OK, _rfuzz, _rprocess

logger = logging.getLogger("rice_analyzer")

# Minimum fuzzy-match score (0-100) to accept a name match
_FUZZY_THRESHOLD = 82


def _normalize_match_name(fiche_name: str) -> str:
    """Trim common role labels that may trail a teacher name in fiche text."""
    return re.sub(
        r"\s*,\s*(?:intervenant|intervenante|enseignant|enseignante|responsable)\b.*$",
        "",
        fiche_name,
        flags=re.IGNORECASE,
    ).strip()


def _substring_match_name(fn_norm: str, ens_lookup: List[Tuple[str, str, str]]) -> Optional[Tuple[str, str]]:
    for eid, display, ens_norm in ens_lookup:
        if ens_norm in fn_norm or _normalize("".join(reversed(ens_norm.split()))) in fn_norm:
            return (eid, display)
        last = ens_norm.split()[-1] if ens_norm.split() else ""
        if len(last) > 3 and last in fn_norm:
            return (eid, display)
    return None


def _match_enseignants_by_name(
    fiche_names: List[str],
    enseignants: List[EnseignantInfo],
) -> Tuple[List[str], Dict[str, Tuple[str, str]]]:
    matched_ids: List[str] = []
    name_to_match: Dict[str, Tuple[str, str]] = {}

    if not enseignants:
        return matched_ids, name_to_match

    ens_lookup: List[Tuple[str, str, str]] = [
        (e.id, f"{e.prenom} {e.nom}".strip(), _normalize(f"{e.prenom} {e.nom}"))
        for e in enseignants
    ]

    for fiche_name in fiche_names:
        cleaned_name = _normalize_match_name(fiche_name)
        fn_norm = _normalize(cleaned_name)

        if _FUZZY_OK:
            choices = {idx: entry[2] for idx, entry in enumerate(ens_lookup)}
            best = _rprocess.extractOne(
                fn_norm,
                choices,
                scorer=_rfuzz.token_sort_ratio,
                score_cutoff=_FUZZY_THRESHOLD,
            )
            if best:
                _, score, idx = best
                eid, display, _ = ens_lookup[idx]
                matched_ids.append(eid)
                name_to_match[fiche_name] = (eid, display)
                logger.debug(f"  Fuzzy match '{fiche_name}' → '{display}' (score={score})")
            continue

        match = _substring_match_name(fn_norm, ens_lookup)
        if match:
            matched_ids.append(match[0])
            name_to_match[fiche_name] = match

    return matched_ids, name_to_match


def _match_enseignants_by_module(
    text: str,
    enseignants: List[EnseignantInfo],
) -> List[str]:
    """Match enseignants whose declared modules overlap with the fiche text."""
    norm_text = _normalize(text)
    matched = []
    for ens in enseignants:
        for mod in ens.modules:
            if len(mod) > 3 and _normalize(mod) in norm_text:
                matched.append(ens.id)
                break
    return matched
