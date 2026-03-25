"""
rice – RICE package (Référentiel Intelligent de Compétences Enseignants)
========================================================================

This package is a **refactored** version of the monolithic ``rice_analyzer.py``.

Sub-modules
-----------
* ``rice.cache``       – Thread-safe cache wrapper & env-var validation
* ``rice.db``          – Database connection pool & enseignant fetch helpers
* ``rice.models``      – Pydantic request/response models
* ``rice.nlp``         – Text extraction, normalization, Bloom, type detection,
                          metadata / acquis / séance extraction
* ``rice.llm``         – LLM stub (désactivé, fallback regex/table NER)
* ``rice.referential`` – Referential data, DB loading, keyword & semantic matching
* ``rice.enseignants`` – Fuzzy enseignant name / module matching
* ``rice.analyzer``    – Core analysis pipeline (``analyze_files``)
* ``rice.routes``      – FastAPI router endpoints

Backward compatibility
----------------------
The top-level ``rice_analyzer.py`` file is kept as a thin re-export shim:
``from rice import *`` – so any existing code that does
``from rice_analyzer import rice_router`` continues to work.
"""

# Explicit __all__ so that ``from rice import *`` re-exports underscore-prefixed
# symbols (Python normally skips names starting with ``_`` for star-imports).
__all__ = [
    # cache
    "_ThreadSafeCache",
    "_validate_env",
    # models
    "EnseignantInfo",
    "SavoirProposition",
    "SousCompetenceProposition",
    "CompetenceProposition",
    "DomaineProposition",
    "FicheEnseignantExtrait",
    "RiceAnalysisResult",
    "ValidateRequest",
    "ValidateSummary",
    # db
    "_get_db_pool",
    "_get_db_connection",
    "_put_db_connection",
    "_AFFECTATIONS_CACHE",
    "_fetch_enseignant_affectations",
    "_AFFECTATIONS_CACHE_TTL",
    "_ENS_INFO_CACHE",
    "_fetch_all_enseignants_info",
    "_dept_to_numeric_id",
    "_create_enseignant_if_new",
    # nlp
    "_serialize_pdf_tables",
    "_extract_pdf",
    "_extract_docx",
    "_extract_text",
    "_secure_filename",
    "_normalize",
    "_slug",
    "_build_domain_name_from_file",
    "_normalize_ref_code",
    "_codes_match",
    "_BLOOM_TO_NIVEAU",
    "_BLOOM_VERBS",
    "_detect_bloom_level",
    "_bloom_to_niveau",
    "_PRATIQUE_PATTERNS",
    "_THEORIQUE_PATTERNS",
    "_UniversalPatterns",
    "_detect_type",
    "_STOP_WORDS",
    "_clean_name",
    "_split_names",
    "_find_meta_key_for_cell",
    "_is_valid_enseignant_value",
    "_TABLE_NER_LABELS",
    "_RE_MODULE_TITLE_ESPRIT",
    "_scan_tables_for_meta",
    "_extract_metadata",
    "_extract_acquis_apprentissage",
    "_extract_referentiel_competences",
    "_extract_seances",
    "_extract_subcompetences",
    "_RE_SUBCOMP_TITLE_1",
    "_RE_SUBCOMP_TITLE_2",
    "_RE_SUBCOMP_TITLE_3",
    "_RE_CHECKMARK",
    "_RE_BULLET",
    "_RE_NUMBERED",
    # llm
    "_LLM_OK",
    "_LLM_MODEL",
    "_LLM_TIMEOUT",
    "_escape_prompt",
    "_llm_chat",
    # nlp – LLM-assisted
    "_llm_extract_metadata",
    "_llm_extract_acquis",
    "_llm_extract_seances",
    "_llm_fallback_items",
    "_llm_extract_subcompetences",
    # referential
    "_SEMANTIC_OK",
    "_GC_FALLBACK_REF",
    "_GC_REFERENTIAL",
    "_GENERIC_FALLBACK_REF",
    "_EMPTY_REFERENTIAL",
    "_REF_DB_CACHE",
    "_REF_DB_TTL",
    "_load_ref_from_db",
    "_load_generic_ref",
    "_get_effective_referential",
    "_get_effective_gc_referential",
    "_DepartmentReferentialManager",
    "_dept_ref_manager",
    "_match_gc_savoir",
    "_gc_ref_niveau",
    "_match_gc_competence",
    "_suggest_gc_enseignants",
    "_SEMANTIC_MODEL",
    "_SEMANTIC_CORPUS",
    "_SEMANTIC_CORPUS_BUILT",
    "_SEMANTIC_CORPUS_DEPT",
    "_SEMANTIC_CORPUS_LOCK",
    "_SEMANTIC_CACHE_DIR",
    "_get_semantic_model",
    "_build_semantic_corpus",
    "_match_gc_savoir_semantic",
    "_detect_departement",
    # enseignants
    "_FUZZY_THRESHOLD",
    "_match_enseignants_by_name",
    "_match_enseignants_by_module",
    # analyzer
    "_analyze_single_fiche",
    "_NIVEAU_ORDER",
    "_get_niveau_from_referentiel",
    "_fallback_extraction",
    "analyze_files",
    # routes
    "rice_router",
    "_AUTH_ENABLED",
    "_AUTH_SECRET",
    "_oauth2_scheme",
    "_get_current_user",
]

from rice.analyzer import (  # noqa: F401
    _NIVEAU_ORDER,
    _analyze_single_fiche,
    _fallback_extraction,
    _get_niveau_from_referentiel,
    analyze_files,
)
from rice.cache import _ThreadSafeCache, _validate_env  # noqa: F401
from rice.db import (  # noqa: F401
    _AFFECTATIONS_CACHE,
    _AFFECTATIONS_CACHE_TTL,
    _ENS_INFO_CACHE,
    _create_enseignant_if_new,
    _dept_to_numeric_id,
    _fetch_all_enseignants_info,
    _fetch_enseignant_affectations,
    _get_db_connection,
    _get_db_pool,
    _put_db_connection,
)
from rice.enseignants import (  # noqa: F401
    _FUZZY_THRESHOLD,
    _match_enseignants_by_module,
    _match_enseignants_by_name,
)
from rice.llm import (  # noqa: F401
    _LLM_MODEL,
    _LLM_OK,
    _LLM_TIMEOUT,
    _escape_prompt,
    _llm_chat,
)
from rice.models import (  # noqa: F401
    CompetenceProposition,
    DomaineProposition,
    EnseignantInfo,
    FicheEnseignantExtrait,
    RiceAnalysisResult,
    SavoirProposition,
    SousCompetenceProposition,
    ValidateRequest,
    ValidateSummary,
)
from rice.nlp import (  # noqa: F401  # noqa: F401  (LLM-assisted NLP)
    _BLOOM_TO_NIVEAU,
    _BLOOM_VERBS,
    _PRATIQUE_PATTERNS,
    _RE_BULLET,
    _RE_CHECKMARK,
    _RE_NUMBERED,
    _RE_SUBCOMP_TITLE_1,
    _RE_SUBCOMP_TITLE_2,
    _RE_SUBCOMP_TITLE_3,
    _STOP_WORDS,
    _TABLE_NER_LABELS,
    _THEORIQUE_PATTERNS,
    _bloom_to_niveau,
    _clean_name,
    _codes_match,
    _detect_bloom_level,
    _detect_type,
    _extract_acquis_apprentissage,
    _extract_docx,
    _extract_metadata,
    _extract_pdf,
    _extract_referentiel_competences,
    _extract_seances,
    _extract_subcompetences,
    _extract_text,
    _build_domain_name_from_file,
    _llm_extract_acquis,
    _llm_extract_metadata,
    _llm_extract_seances,
    _llm_extract_subcompetences,
    _llm_fallback_items,
    _find_meta_key_for_cell,
    _is_valid_enseignant_value,
    _normalize,
    _normalize_ref_code,
    _RE_MODULE_TITLE_ESPRIT,
    _scan_tables_for_meta,
    _secure_filename,
    _serialize_pdf_tables,
    _slug,
    _split_names,
    _UniversalPatterns,
)
from rice.referential import (  # noqa: F401
    _EMPTY_REFERENTIAL,
    _GC_FALLBACK_REF,
    _GC_REFERENTIAL,
    _GENERIC_FALLBACK_REF,
    _REF_DB_CACHE,
    _REF_DB_TTL,
    _SEMANTIC_CACHE_DIR,
    _SEMANTIC_CORPUS,
    _SEMANTIC_CORPUS_BUILT,
    _SEMANTIC_CORPUS_DEPT,
    _SEMANTIC_CORPUS_LOCK,
    _SEMANTIC_MODEL,
    _SEMANTIC_OK,
    _build_semantic_corpus,
    _DepartmentReferentialManager,
    _dept_ref_manager,
    _detect_departement,
    _gc_ref_niveau,
    _get_effective_gc_referential,
    _get_effective_referential,
    _get_semantic_model,
    _load_generic_ref,
    _load_ref_from_db,
    _match_gc_competence,
    _match_gc_savoir,
    _match_gc_savoir_semantic,
    _suggest_gc_enseignants,
)
from rice.routes import (  # noqa: F401
    _AUTH_ENABLED,
    _AUTH_SECRET,
    _get_current_user,
    _oauth2_scheme,
    rice_router,
)
