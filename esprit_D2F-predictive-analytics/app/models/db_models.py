"""SQLAlchemy ORM models for analytics-owned tables."""

from datetime import date, datetime, timezone
from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime,
    Integer, Numeric, SmallInteger, String, Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def _now():
    return datetime.now(timezone.utc)


class FeatureSnapshot(Base):
    __tablename__ = "feature_snapshots"

    id                         = Column(BigInteger, primary_key=True, autoincrement=True)
    enseignant_id              = Column(String(36), nullable=False, index=True)
    snapshot_date              = Column(Date, nullable=False, default=date.today)
    nb_savoirs_evalues         = Column(Integer, nullable=False, default=0)
    nb_savoirs_niveau_1        = Column(Integer, nullable=False, default=0)
    nb_savoirs_niveau_2        = Column(Integer, nullable=False, default=0)
    nb_savoirs_niveau_3        = Column(Integer, nullable=False, default=0)
    nb_savoirs_niveau_4        = Column(Integer, nullable=False, default=0)
    nb_savoirs_niveau_5        = Column(Integer, nullable=False, default=0)
    niveau_moyen_competences   = Column(Numeric(4, 2), nullable=False, default=0.0)
    nb_formations_inscrites    = Column(Integer, nullable=False, default=0)
    nb_formations_approuvees   = Column(Integer, nullable=False, default=0)
    nb_formations_completees   = Column(Integer, nullable=False, default=0)
    taux_completion_formations = Column(Numeric(5, 2), nullable=False, default=0.0)
    taux_presence_moyen        = Column(Numeric(5, 2), nullable=False, default=0.0)
    nb_besoins_exprimes        = Column(Integer, nullable=False, default=0)
    nb_besoins_approuves       = Column(Integer, nullable=False, default=0)
    priorite_besoin_max        = Column(String(20))
    note_evaluation_moyenne    = Column(Numeric(4, 2))
    nb_evaluations_soumises    = Column(Integer, nullable=False, default=0)
    nb_certificats_obtenus     = Column(Integer, nullable=False, default=0)
    computed_at                = Column(DateTime(timezone=True), default=_now)


class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    enseignant_id        = Column(String(36), nullable=False, index=True)
    competence_id        = Column(BigInteger, nullable=False, index=True)
    competence_code      = Column(String(50), nullable=False)
    competence_nom       = Column(String(255), nullable=False)
    domaine_id           = Column(BigInteger)
    domaine_nom          = Column(String(255))
    niveau_actuel        = Column(SmallInteger, nullable=False, default=0)
    niveau_requis        = Column(SmallInteger, nullable=False, default=1)
    niveau_vise          = Column(SmallInteger, nullable=False, default=3)
    gap_score            = Column(Numeric(5, 4), nullable=False, default=0.0)
    impact_score         = Column(Numeric(5, 4), nullable=False, default=0.0)
    urgence_score        = Column(Numeric(5, 4), nullable=False, default=0.0)
    priorite_score       = Column(Numeric(5, 4), nullable=False, default=0.0)
    niveau_urgence       = Column(String(20), nullable=False, default="FAIBLE")
    mois_stagnation      = Column(Integer, nullable=False, default=0)
    en_regression        = Column(Boolean, nullable=False, default=False)
    nb_besoins_exprimes  = Column(Integer, nullable=False, default=0)
    derniere_evaluation  = Column(Date)
    justification        = Column(Text)
    prediction_result_id = Column(BigInteger)
    computed_at          = Column(DateTime(timezone=True), default=_now)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    enseignant_id        = Column(String(36), nullable=False, index=True)
    competence_id        = Column(BigInteger, nullable=False)
    skill_gap_id         = Column(BigInteger)
    formation_id         = Column(BigInteger, nullable=False)
    formation_titre      = Column(String(255), nullable=False)
    formation_type       = Column(String(20))
    score_pertinence     = Column(Numeric(5, 4), nullable=False, default=0.0)
    score_taux_reussite  = Column(Numeric(5, 4), nullable=False, default=0.0)
    score_disponibilite  = Column(Numeric(5, 4), nullable=False, default=0.0)
    score_global         = Column(Numeric(5, 4), nullable=False, default=0.0)
    probabilite_reussite = Column(Numeric(5, 4), nullable=False, default=0.0)
    rang_dans_parcours   = Column(Integer, nullable=False, default=1)
    est_prerequis        = Column(Boolean, nullable=False, default=False)
    prerequis_satisfaits = Column(Boolean, nullable=False, default=True)
    niveau_apres         = Column(SmallInteger)
    justification        = Column(Text)
    facteurs_score       = Column(JSONB)
    statut               = Column(String(20), nullable=False, default="PROPOSEE")
    training_path_id     = Column(BigInteger)
    created_at           = Column(DateTime(timezone=True), default=_now)
    updated_at           = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class TrainingPath(Base):
    __tablename__ = "training_paths"

    id                           = Column(BigInteger, primary_key=True, autoincrement=True)
    enseignant_id                = Column(String(36), nullable=False, index=True)
    competence_id                = Column(BigInteger, nullable=False)
    competence_nom               = Column(String(255), nullable=False)
    niveau_depart                = Column(SmallInteger, nullable=False, default=0)
    niveau_vise                  = Column(SmallInteger, nullable=False, default=3)
    nb_formations                = Column(Integer, nullable=False, default=0)
    duree_totale_heures          = Column(Integer, nullable=False, default=0)
    probabilite_reussite_globale = Column(Numeric(5, 4), nullable=False, default=0.0)
    statut                       = Column(String(20), nullable=False, default="ACTIF")
    created_at                   = Column(DateTime(timezone=True), default=_now)
    updated_at                   = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class TrainingPathItem(Base):
    __tablename__ = "training_path_items"

    id                    = Column(BigInteger, primary_key=True, autoincrement=True)
    training_path_id      = Column(BigInteger, nullable=False, index=True)
    formation_id          = Column(BigInteger, nullable=False)
    formation_titre       = Column(String(255), nullable=False)
    formation_type        = Column(String(20))
    duree_heures          = Column(Integer, nullable=False, default=0)
    rang                  = Column(Integer, nullable=False)
    est_obligatoire       = Column(Boolean, nullable=False, default=True)
    prerequis_competences = Column(JSONB)
    niveau_avant          = Column(SmallInteger, nullable=False, default=0)
    niveau_apres          = Column(SmallInteger, nullable=False, default=1)
    prerequis_satisfaits  = Column(Boolean, nullable=False, default=True)
    deja_suivie           = Column(Boolean, nullable=False, default=False)
    score_formation       = Column(Numeric(5, 4), nullable=False, default=0.0)
    justification         = Column(Text)


class TeacherRiskProfile(Base):
    __tablename__ = "teacher_risk_profiles"

    id                         = Column(BigInteger, primary_key=True, autoincrement=True)
    enseignant_id              = Column(String(36), nullable=False, unique=True)
    score_risque               = Column(Numeric(5, 4), nullable=False, default=0.0)
    niveau_risque              = Column(String(20), nullable=False, default="FAIBLE")
    nb_gaps_critiques          = Column(Integer, nullable=False, default=0)
    nb_gaps_moderes            = Column(Integer, nullable=False, default=0)
    nb_gaps_faibles            = Column(Integer, nullable=False, default=0)
    nb_mois_stagnation_max     = Column(Integer, nullable=False, default=0)
    tendance                   = Column(String(20), nullable=False, default="STABLE")
    taux_completion_formations = Column(Numeric(5, 2), nullable=False, default=0.0)
    facteurs_risque            = Column(JSONB)
    recommandations_urgentes   = Column(JSONB)
    computed_at                = Column(DateTime(timezone=True), default=_now)
    precedent_score_risque     = Column(Numeric(5, 4))


class PredictionResult(Base):
    __tablename__ = "prediction_results"

    id                       = Column(BigInteger, primary_key=True, autoincrement=True)
    enseignant_id            = Column(String(36), nullable=False, index=True)
    analyse_date             = Column(DateTime(timezone=True), default=_now)
    nb_competences_analysees = Column(Integer, nullable=False, default=0)
    nb_gaps_detectes         = Column(Integer, nullable=False, default=0)
    nb_gaps_critiques        = Column(Integer, nullable=False, default=0)
    nb_recommendations       = Column(Integer, nullable=False, default=0)
    nb_alertes_generees      = Column(Integer, nullable=False, default=0)
    score_global_competences = Column(Numeric(5, 4), nullable=False, default=0.0)
    score_progression        = Column(Numeric(5, 4), nullable=False, default=0.0)
    statut                   = Column(String(20), nullable=False, default="EN_COURS")
    message_erreur           = Column(Text)
    duree_analyse_ms         = Column(Integer)
    details_json             = Column(JSONB)


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id                     = Column(BigInteger, primary_key=True, autoincrement=True)
    type_alerte            = Column(String(40), nullable=False)
    cible_type             = Column(String(20), nullable=False, default="INDIVIDUEL")
    enseignant_id          = Column(String(36), index=True)
    departement_id         = Column(String(36))
    competence_id          = Column(BigInteger)
    skill_gap_id           = Column(BigInteger)
    severite               = Column(String(20), nullable=False, default="WARNING")
    titre                  = Column(String(255), nullable=False)
    message                = Column(Text, nullable=False)
    details_json           = Column(JSONB)
    statut                 = Column(String(20), nullable=False, default="NOUVELLE")
    traite_par             = Column(String(36))
    commentaire_traitement = Column(Text)
    created_at             = Column(DateTime(timezone=True), default=_now)
    updated_at             = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class ModelRetrainingLog(Base):
    """Journal des ré-entraînements de modèle (spec §5 — rollback protection)."""

    __tablename__ = "model_retraining_log"

    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    model_name       = Column(String(100), nullable=False, default="gap_predictor")
    model_version    = Column(String(40))
    accuracy_before  = Column(Numeric(6, 4))
    accuracy_after   = Column(Numeric(6, 4))
    accuracy_metric  = Column(String(20), nullable=False, default="test_r2")
    dataset_size     = Column(Integer, nullable=False, default=0)
    statut           = Column(String(20), nullable=False, default="success")  # success|rollback|failed
    raison           = Column(Text)
    triggered_by     = Column(String(36))
    retrained_at     = Column(DateTime(timezone=True), default=_now)


class DashboardSnapshot(Base):
    __tablename__ = "dashboard_snapshots"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    scope         = Column(String(20), nullable=False, default="GLOBAL")
    scope_id      = Column(String(36))
    snapshot_date = Column(Date, nullable=False, default=date.today)
    kpis_json     = Column(JSONB, nullable=False)
    computed_at   = Column(DateTime(timezone=True), default=_now)
