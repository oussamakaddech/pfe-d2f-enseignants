from app.application.ports import AnalysisRepository, BesoinSource, CompetencySource, EvaluationSource, FormationSource, ModelPort
from app.core.config import Settings
from app.domain.entities.risk_profile import RiskProfile
from app.domain.services.risk_calculator import RiskInputs, compute_risk

DECLINE_LOOKBACK_MONTHS = 12
STAGNATION_LOOKBACK_MONTHS = 18


class ComputeRisk:
    # Injecte les sources de données (compétences, formations, évaluations,
    # besoins) + dépôt d'analyse, port ML et configuration (poids du risque).
    def __init__(
        self,
        competency_source: CompetencySource,
        formation_source: FormationSource,
        evaluation_source: EvaluationSource,
        besoin_source: BesoinSource,
        analysis_repository: AnalysisRepository,
        model_port: ModelPort,
        settings: Settings,
    ) -> None:
        self._competency_source = competency_source
        self._formation_source = formation_source
        self._evaluation_source = evaluation_source
        self._besoin_source = besoin_source
        self._analysis_repository = analysis_repository
        self._model_port = model_port
        self._settings = settings

    # Point d'entrée simple : délègue à execute_serving et ignore l'état de serving.
    def execute(self, teacher_id: str) -> tuple[RiskProfile, str, str | None, str | None]:
        profile, mode, version, name, _serving = self.execute_serving(teacher_id)
        return profile, mode, version, name

    def execute_serving(self, teacher_id: str) -> tuple[RiskProfile, str, str | None, str | None, dict]:
        """Risque + etat de serving (mode ML | HEURISTIC, payload ML, fallback_reason).

        Le mode expose decrit le moteur qui a REELLEMENT produit le score :
        "ML" uniquement si le modele de risque calibre a servi ; sinon
        "HEURISTIC" avec ``fallback_reason`` explicite — jamais un mode ML
        mensonger.
        """
        status = self._model_port.status()
        model_version = status.get("model_version")
        model_name = status.get("artifact_name") or status.get("model_name")

        profile, ml_payload, fallback_reason = self._model_port.predict_risk_serving(teacher_id)
        if profile is None:
            # Repli legacy : regles sur les gaps (RF ancien / regles) puis
            # heuristique comportementale — jamais de score force.
            profile = self._model_port.predict_risk(teacher_id)
            fallback_reason = fallback_reason or "modele de risque calibre indisponible — regles sur les gaps (0.50/0.12/0.40)"
            if profile is None:
                profile = self._heuristic(teacher_id)
                fallback_reason = fallback_reason or "modele de risque indisponible — heuristique comportementale"
        self._analysis_repository.save_risk_snapshot(profile)

        serving: dict = {
            "mode": "ML" if ml_payload is not None else "HEURISTIC",
            "payload": ml_payload,
            "fallback_reason": fallback_reason,
            "weights_heuristic": {"critical_gaps": 0.50, "high_gaps": 0.12, "avg_gap_score": 0.40},
            "data_origin": (ml_payload or {}).get("data_origin") or status.get("data_origin"),
            "validation_scope": (ml_payload or {}).get("validation_scope") or status.get("validation_scope"),
        }
        if ml_payload is not None:
            try:
                reference = self._model_port.heuristic_risk_reference(teacher_id)
                serving["heuristic_reference_factors"] = [f.to_dict() for f in reference.factors]
            except Exception:
                serving["heuristic_reference_factors"] = []
            return profile, "ML", model_version, model_name, serving

        # Le score provient des regles explicables sur les gaps (comportement
        # historique, conserve pour coherence avec les gaps affiches).
        return profile, "HEURISTIC", model_version, model_name, serving

    # Version legacy conservée pour compatibilité : tente le ML (modèle de
    # risque dédié), sinon règles sur les gaps, sinon heuristique — le mode
    # exposé reflète TOUJOURS le moteur qui a réellement servi.
    def execute_legacy(self, teacher_id: str) -> tuple[RiskProfile, str, str | None, str | None]:
        status = self._model_port.status()

        model_mode = status.get("model_mode") or "HEURISTIC_FALLBACK"
        model_version = status.get("model_version")
        model_name = status.get("artifact_name") or status.get("model_name")

        ml_profile = self._model_port.predict_risk(teacher_id)
        # Le mode exposé décrit le moteur qui a RÉELLEMENT produit le score :
        # "ml" uniquement si le modèle de risque dédié a servi. Sinon le score
        # provient des règles explicables sur les gaps (comportement historique,
        # conservé pour cohérence avec les gaps affichés) et le mode exposé est
        # HEURISTIC_FALLBACK — jamais un mode ML mensonger.
        engine = str(status.get("risk_engine") or "")
        if ml_profile is not None:
            self._analysis_repository.save_risk_snapshot(ml_profile)
            if engine == "ml":
                return ml_profile, model_mode, model_version, model_name
            return ml_profile, "HEURISTIC_FALLBACK", model_version, model_name

        profile = self._heuristic(teacher_id)
        self._analysis_repository.save_risk_snapshot(profile)
        return profile, "HEURISTIC_FALLBACK", model_version, model_name

    # Heuristique comportementale : collecte les données réelles de
    # l'enseignant (stagnation, régression, assiduité, évaluations, besoins,
    # dernière activité) puis applique le moteur de règles compute_risk().
    def _heuristic(self, teacher_id: str) -> RiskProfile:
        history = self._competency_source.get_teacher_savoir_levels_history(teacher_id)
        has_decline = self._has_decline(history)

        latest_date = None
        for events in history.values():
            for date_str, _ in events:
                if latest_date is None or date_str > latest_date:
                    latest_date = date_str

        stagnation_months = self._stagnation_months(latest_date)
        attendance = self._formation_source.get_attendance_rate(teacher_id)
        avg_eval = self._evaluation_source.get_avg_eval_score(teacher_id)
        needs = self._besoin_source.count_declared_needs(teacher_id, 12)
        last_activity = self._formation_source.get_days_since_last_activity(teacher_id)

        inputs = RiskInputs(
            teacher_id=teacher_id,
            stagnation_months=stagnation_months,
            declined=has_decline,
            attendance_rate=attendance if attendance is not None else 0.5,
            avg_eval_score=avg_eval,
            repeated_need_count=float(needs),
            days_since_last_activity=last_activity,
        )
        return compute_risk(inputs, self._settings.risk_weights)

    # Nombre de mois depuis la dernière mise à jour de niveau de l'enseignant
    # (= stagnation). Aucune donnée → valeur de référence 18 mois.
    def _stagnation_months(self, latest_date: str | None) -> float:
        if latest_date is None:
            return float(STAGNATION_LOOKBACK_MONTHS)
        from datetime import date, datetime

        try:
            last = datetime.fromisoformat(latest_date).date()
        except ValueError:
            return float(STAGNATION_LOOKBACK_MONTHS)
        return (date.today() - last).days / 30.44

    # Détecte une régression de niveau : True si au moins un savoir a un
    # niveau actuel strictement inférieur à son premier niveau enregistré.
    def _has_decline(self, history: dict[int, list[tuple[str, int]]]) -> bool:
        for events in history.values():
            levels = [level for _, level in events]
            if len(levels) >= 2 and levels[-1] < levels[0]:
                return True
        return False
