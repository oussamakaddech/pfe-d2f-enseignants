"""Dataset contracts — schémas normalisés des 12 datasets D2F (ENSxxx only).

Chaque dataset est décrit par:
- schéma (colonnes, types, requises)
- clés primaires / étrangères
- règles de validation, nettoyage, rejet, déduplication
- champs d'audit et source system

Le data dictionary est généré en JSON + Markdown par scripts/build_data_dictionary.py.
"""

from __future__ import annotations

from typing import Any

TEACHER_ID_DOC = "Identifiant enseignant canonique ENSxxx (3-6 chiffres)."


def col(
    name: str,
    type_: str,
    required: bool,
    description: str,
    *,
    pk: bool = False,
    fk: str | None = None,
    enum: list[str] | None = None,
    calculated: bool = False,
    audit: bool = False,
    computed_from: str | None = None,
) -> dict[str, Any]:
    return {
        "name": name,
        "type": type_,
        "required": required,
        "description": description,
        "primary_key": pk,
        "foreign_key": fk,
        "enum": enum or [],
        "calculated": calculated,
        "audit": audit,
        "computed_from": computed_from,
    }


DATASETS: dict[str, dict[str, Any]] = {
    "teachers": {
        "file": "teachers.csv",
        "source_system": "auth-service + formation-service",
        "description": "Référentiel des enseignants.",
        "primary_key": ["teacher_id"],
        "columns": [
            col("teacher_id", "string", True, TEACHER_ID_DOC, pk=True),
            col("full_name", "string", True, "Nom complet"),
            col("department_code", "string", True, "Code département"),
            col("department_name", "string", False, "Libellé département"),
            col("up_code", "string", True, "Code unité pédagogique"),
            col("role", "enum", True, "Rôle métier", enum=["TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN"]),
            col("status", "enum", False, "Statut", enum=["ACTIVE", "INACTIVE", "ON_LEAVE"]),
            col("hire_date", "date", False, "Date d'embauche"),
            col("created_at", "datetime", False, "Audit", audit=True),
            col("updated_at", "datetime", False, "Audit", audit=True),
        ],
        "validation_rules": [
            "teacher_id doit matcher ^ENS\\d{3,6}$",
            "department_code et up_code obligatoires",
            "role dans l'enum autorisé",
        ],
        "cleaning_rules": [
            "normaliser teacher_id en majuscules",
            "rejeter Txxx sauf alias fourni",
        ],
        "rejection_rules": [
            "teacher_id non-ENS rejeté sans alias",
            "doublon strict sur teacher_id rejeté (dernière ligne gagnante)",
        ],
        "deduplication": "Dernière version gagnante sur (teacher_id)",
    },
    "teacher_competencies": {
        "file": "teacher_competencies.csv",
        "source_system": "competence-service",
        "description": "Niveaux maîtrisés par enseignant par savoir.",
        "primary_key": ["teacher_id", "knowledge_id"],
        "foreign_keys": {"teacher_id": "teachers.teacher_id", "knowledge_id": "required_levels.knowledge_id"},
        "columns": [
            col("teacher_id", "string", True, TEACHER_ID_DOC, pk=True, fk="teachers.teacher_id"),
            col("knowledge_id", "string", True, "Savoir du référentiel", pk=True),
            col("current_level", "int", False, "Niveau actuel N1..N5 (1..5)", enum=["1", "2", "3", "4", "5"]),
            col("last_assessment_date", "date", False, "Date de dernière évaluation"),
            col("validated", "bool", False, "Compétence validée"),
            col("source", "string", False, "Source du niveau (évaluation, auto, admin)"),
            col("created_at", "datetime", False, "Audit", audit=True),
        ],
        "validation_rules": [
            "current_level ∈ 1..5 sinon null",
            "teacher_id doit exister dans teachers",
            "knowledge_id doit exister dans required_levels",
        ],
        "cleaning_rules": [
            "conversion N3 -> 3",
            "current_level hors plage => null + rapport",
        ],
        "rejection_rules": [
            "teacher_id inconnu dans teachers",
            "knowledge_id inconnu dans required_levels",
        ],
        "deduplication": "Dernière évaluation gagnante sur (teacher_id, knowledge_id)",
    },
    "required_levels": {
        "file": "required_levels.csv",
        "source_system": "competence-service (référentiel)",
        "description": "Référentiel Domaines/Compétences/Sous-compétences/Savoirs + niveaux requis.",
        "primary_key": ["knowledge_id"],
        "columns": [
            col("knowledge_id", "string", True, "Savoir", pk=True),
            col("knowledge_code", "string", False, "Code savoir"),
            col("knowledge_name", "string", True, "Libellé savoir"),
            col("knowledge_type", "enum", True, "Type", enum=["THEORETICAL", "PRACTICAL"]),
            col("sub_competency_id", "string", True, "Sous-compétence parente"),
            col("sub_competency_name", "string", False, "Libellé sous-compétence"),
            col("competency_id", "string", True, "Compétence parente"),
            col("competency_name", "string", False, "Libellé compétence"),
            col("domain_id", "string", True, "Domaine parent"),
            col("domain_name", "string", False, "Libellé domaine"),
            col("required_level", "int", True, "Niveau requis (référence)", enum=["1", "2", "3", "4", "5"]),
            col("is_critical", "bool", False, "Compétence critique pour le poste"),
            col("prereq_knowledge_ids", "string", False, "Liste '|' des savoirs prérequis"),
        ],
        "validation_rules": [
            "required_level ∈ 1..5",
            "knowledge_type ∈ THEORETICAL|PRACTICAL",
            "identifiants hiérarchiques cohérents",
        ],
        "rejection_rules": ["required_level hors plage", "knowledge_type invalide"],
        "deduplication": "Dernière version gagnante sur (knowledge_id)",
    },
    "training_catalog": {
        "file": "training_catalog.csv",
        "source_system": "formation-service",
        "description": "Catalogue des formations.",
        "primary_key": ["training_id"],
        "columns": [
            col("training_id", "string", True, "Identifiant formation", pk=True),
            col("title", "string", True, "Titre de la formation"),
            col("state", "enum", False, "État", enum=["DRAFT", "PLANIFIE", "ANNULE", "EN_COURS", "ACHEVE"]),
            col("active", "bool", True, "Formation active"),
            col("cancelled", "bool", True, "Formation annulée"),
            col("registration_open", "bool", True, "Inscriptions ouvertes"),
            col("training_type", "enum", False, "Type", enum=["INTERNE", "EXTERNE", "EN_LIGNE"]),
            col("start_date", "date", False, "Début"),
            col("end_date", "date", False, "Fin"),
            col("duration_hours", "float", True, "Charge horaire"),
            col("department_code", "string", False, "Restriction département"),
            col("up_code", "string", False, "Restriction UP"),
            col("role", "string", False, "Restriction rôle"),
            col("capacity", "int", False, "Capacité max (null = inconnue)"),
            col("registration_count", "int", False, "Inscrits actuels"),
            col("effective_availability", "bool", False, "Calculée: capacité disponible si connue", calculated=True, computed_from="capacity, registration_count"),
            col("prereq_training_ids", "string", False, "Prérequis formations '|'"),
            col("available_from", "date", False, "Disponible à partir de"),
            col("updated_at", "datetime", False, "Audit", audit=True),
        ],
        "validation_rules": [
            "end_date >= start_date si les deux présents",
            "duration_hours > 0",
            "annulé => non recommandable",
        ],
        "rejection_rules": ["end_date < start_date"],
        "deduplication": "Dernière version gagnante sur (training_id)",
    },
    "training_competency_links": {
        "file": "training_competency_links.csv",
        "source_system": "formation-service (formation_competences)",
        "description": "Liens formation -> savoirs visés (niveau prérequis / visé).",
        "primary_key": ["training_id", "knowledge_id"],
        "foreign_keys": {"training_id": "training_catalog.training_id", "knowledge_id": "required_levels.knowledge_id"},
        "columns": [
            col("training_id", "string", True, "Formation", pk=True, fk="training_catalog.training_id"),
            col("knowledge_id", "string", True, "Savoir ciblé", pk=True, fk="required_levels.knowledge_id"),
            col("niveau_prerequis", "int", False, "Niveau prérequis (1..5)"),
            col("niveau_vise", "int", False, "Niveau visé en fin de formation (1..5)"),
        ],
        "validation_rules": [
            "training_id et knowledge_id doivent exister",
            "niveau_vise ∈ 1..5",
        ],
        "rejection_rules": ["lien sans formation", "lien sans savoir"],
        "deduplication": "Dernière version gagnante sur (training_id, knowledge_id)",
    },
    "enrollments": {
        "file": "enrollments.csv",
        "source_system": "formation-service (inscriptions)",
        "description": "Inscriptions des enseignants aux formations.",
        "primary_key": ["enrollment_id"],
        "foreign_keys": {"teacher_id": "teachers.teacher_id", "training_id": "training_catalog.training_id"},
        "columns": [
            col("enrollment_id", "string", True, "Identifiant inscription", pk=True),
            col("teacher_id", "string", True, TEACHER_ID_DOC, fk="teachers.teacher_id"),
            col("training_id", "string", True, "Formation", fk="training_catalog.training_id"),
            col("status", "enum", True, "Statut", enum=["ENROLLED", "COMPLETED", "DROPPED", "PENDING"]),
            col("enrolled_at", "date", True, "Date d'inscription"),
            col("completion_date", "date", False, "Date de complétion"),
            col("certificate_issued", "bool", False, "Certificat émis"),
        ],
        "validation_rules": [
            "completion_date >= enrolled_at",
            "COMPLETED => completion_date présente",
        ],
        "rejection_rules": ["teacher_id inconnu", "training_id inconnu", "completion_date < enrolled_at"],
        "deduplication": "Dernière version gagnante sur (enrollment_id)",
    },
    "attendance": {
        "file": "attendance.csv",
        "source_system": "formation-service",
        "description": "Présence aux sessions.",
        "primary_key": ["attendance_id"],
        "columns": [
            col("attendance_id", "string", True, "Identifiant", pk=True),
            col("teacher_id", "string", True, TEACHER_ID_DOC, fk="teachers.teacher_id"),
            col("training_id", "string", True, "Formation", fk="training_catalog.training_id"),
            col("session_date", "date", True, "Date de session"),
            col("present", "bool", True, "Présent"),
        ],
        "validation_rules": ["session_date valide", "présence booléenne"],
        "rejection_rules": ["session_date future incohérente (> aujourd'hui)"],
        "deduplication": "Dernière version gagnante sur (attendance_id)",
    },
    "evaluations": {
        "file": "evaluations.csv",
        "source_system": "evaluation-service",
        "description": "Évaluations post-formation.",
        "primary_key": ["evaluation_id"],
        "columns": [
            col("evaluation_id", "string", True, "Identifiant", pk=True),
            col("teacher_id", "string", True, TEACHER_ID_DOC, fk="teachers.teacher_id"),
            col("training_id", "string", True, "Formation", fk="training_catalog.training_id"),
            col("note", "float", False, "Note /20"),
            col("satisfaisant", "bool", False, "Satisfaction"),
            col("evaluation_date", "date", True, "Date"),
        ],
        "validation_rules": ["note ∈ 0..20 ou null"],
        "rejection_rules": ["note hors plage"],
        "deduplication": "Dernière version gagnante sur (evaluation_id)",
    },
    "certificates": {
        "file": "certificates.csv",
        "source_system": "certificat-service",
        "description": "Certificats émis.",
        "primary_key": ["certificate_id"],
        "columns": [
            col("certificate_id", "string", True, "Identifiant", pk=True),
            col("teacher_id", "string", True, TEACHER_ID_DOC, fk="teachers.teacher_id"),
            col("training_id", "string", True, "Formation", fk="training_catalog.training_id"),
            col("issued_date", "date", True, "Date d'émission"),
            col("valid", "bool", True, "Certificat valide"),
        ],
        "validation_rules": ["certificat => completion de la formation"],
        "rejection_rules": ["certificat sans COMPLETED associé"],
        "deduplication": "Dernière version gagnante sur (certificate_id)",
    },
    "training_needs": {
        "file": "training_needs.csv",
        "source_system": "besoin-formation-service",
        "description": "Besoins de formation exprimés/validés.",
        "primary_key": ["need_id"],
        "columns": [
            col("need_id", "string", True, "Identifiant besoin", pk=True),
            col("teacher_id", "string", True, TEACHER_ID_DOC, fk="teachers.teacher_id"),
            col("knowledge_id", "string", False, "Savoir concerné (optionnel)"),
            col("status", "enum", True, "Statut", enum=["PENDING", "APPROVED", "REJECTED", "FULFILLED"]),
            col("requested_at", "date", True, "Date de demande"),
            col("priority", "int", False, "Priorité 1..5"),
            col("theme", "string", False, "Thème"),
        ],
        "validation_rules": ["status dans l'enum", "requested_at valide"],
        "deduplication": "Dernière version gagnante sur (need_id)",
    },
    "teacher_profile_snapshots": {
        "file": "teacher_profile_snapshots.csv",
        "source_system": "predictive-analytics (généré)",
        "description": "Snapshots temporels des profils pour apprentissage supervisé.",
        "primary_key": ["snapshot_id"],
        "columns": [
            col("snapshot_id", "string", True, "Identifiant snapshot", pk=True),
            col("teacher_id", "string", True, TEACHER_ID_DOC, fk="teachers.teacher_id"),
            col("snapshot_date", "date", True, "Date du snapshot"),
            col("avg_current_level", "float", False, "Niveau moyen", calculated=True),
            col("avg_required_level", "float", False, "Requis moyen", calculated=True),
            col("nb_gaps_open", "int", False, "Gaps ouverts", calculated=True),
            col("weighted_gap_severity", "float", False, "Sévérité pondérée", calculated=True),
            col("has_data", "bool", True, "Snapshot exploitable"),
        ],
        "validation_rules": ["snapshot_date croissante par enseignant"],
        "deduplication": "Dernière version gagnante sur (teacher_id, snapshot_date)",
    },
    "training_outcomes": {
        "file": "training_outcomes.csv",
        "source_system": "predictive-analytics (généré)",
        "description": "Observations post-formation (cibles ML).",
        "primary_key": ["outcome_id"],
        "columns": [
            col("outcome_id", "string", True, "Identifiant", pk=True),
            col("teacher_id", "string", True, TEACHER_ID_DOC, fk="teachers.teacher_id"),
            col("training_id", "string", True, "Formation", fk="training_catalog.training_id"),
            col("completed", "bool", True, "Cible: complétion", calculated=True),
            col("effectiveness_score", "float", False, "Cible: efficacité 0..1", calculated=True),
            col("stagnation_risk", "bool", False, "Cible: stagnation future", calculated=True),
            col("future_need", "bool", False, "Cible: besoin futur", calculated=True),
            col("outcome_date", "date", True, "Date d'observation"),
        ],
        "validation_rules": ["outcome_date > fin de formation"],
        "deduplication": "Dernière version gagnante sur (outcome_id)",
    },
}


def data_dictionary() -> dict[str, Any]:
    return {
        "id_policy": "ENSxxx uniquement. Txxx rejeté sauf alias (data/raw/id_aliases.csv).",
        "version": "1.0.0",
        "datasets": DATASETS,
    }
