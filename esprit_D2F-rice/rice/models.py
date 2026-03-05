"""Pydantic request / response models for the RICE API."""

from __future__ import annotations

from typing import List, Optional, Dict, Any

from pydantic import BaseModel


class EnseignantInfo(BaseModel):
    id: str
    nom: str
    prenom: str
    modules: List[str] = []   # list of module names the teacher handles


class SavoirProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    type: str                  # THEORIQUE | PRATIQUE
    niveau: str                # N1_DEBUTANT … N5_EXPERT
    enseignantsSuggeres: List[str] = []   # list of enseignant IDs
    refCodes: List[str] = []             # matched referential codes (e.g. S1a, C2b, INFO-A1)


class SousCompetenceProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    refCodes: List[str] = []         # aggregated from savoirs
    savoirs: List[SavoirProposition] = []


class CompetenceProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    ordre: int = 1
    refCodes: List[str] = []         # aggregated from sous-compétences
    refDomaine: Optional[str] = None # best domain match (e.g. GC-TECH-S, INFO-A)
    sousCompetences: List[SousCompetenceProposition] = []


class DomaineProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    refCodes: List[str] = []         # all referential codes found in this domaine
    refDomaine: Optional[str] = None # best domain match (e.g. GC-TECH-S, INFO-A)
    competences: List[CompetenceProposition] = []


class FicheEnseignantExtrait(BaseModel):
    """Professor name extracted from a fiche module."""
    fichier: str                              # source filename
    nom_complet: str                          # raw name as found in fiche
    role: str = "enseignant"                   # responsable | coordinateur | enseignant | intervenant
    matched_id: Optional[str] = None          # matched enseignant ID (if fuzzy-matched)
    matched_nom: Optional[str] = None         # matched full name for display


class RiceAnalysisResult(BaseModel):
    propositions: List[DomaineProposition]
    stats: Dict[str, Any]
    extractedEnseignants: List[FicheEnseignantExtrait] = []  # professors found in fiches
    foundEnseignants: List[EnseignantInfo] = []  # Added this field


class ValidateRequest(BaseModel):
    """Body sent by the frontend after drag-&-drop review of the analysis result."""
    propositions: List[DomaineProposition]
    # When True, existing rows with the same id are deleted before re-insert
    overwrite: bool = False


class ValidateSummary(BaseModel):
    status: str
    upserted_domaines: int = 0
    upserted_competences: int = 0
    upserted_sous_competences: int = 0
    inserted_savoirs: int
    updated_savoirs: int
    inserted_enseignant_links: int
    errors: List[str] = []
