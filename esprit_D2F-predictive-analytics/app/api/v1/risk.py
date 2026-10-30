from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.scope import enforce_teacher_access, resolve_teacher_or_404
from app.core.security import CurrentUser, require_roles

router = APIRouter(prefix="/teachers/{teacher_id}/risk", tags=["risk"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


@router.get("")
def get_risk(teacher_id: str, container: ContainerDependency, user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))]):
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    profile, model_mode, model_version, model_name, serving = container.compute_risk.execute_serving(teacher_id)
    payload = profile.to_dict(model_mode, model_version)["data"]
    ml_payload = serving.get("payload")
    if ml_payload is not None:
        # Score servi par le modele de risque calibre : probabilité calibrée de la
        # classe prédite, contributions SHAP, étiquetage simulation complet.
        payload["mode"] = "ML"
        payload["risk_class"] = ml_payload["risk_class"]
        payload["probability_calibrated"] = ml_payload["probability_calibrated"]
        payload["probabilities"] = ml_payload["probabilities"]
        payload["contributions"] = ml_payload["contributions"]
        payload["explanation_method"] = ml_payload["explanation_method"]
        payload["score_type"] = "CALIBRATED_PROBABILITY_MODEL"
        payload["calibration_status"] = "CALIBRATED"
        payload["heuristic_reference"] = {
            "description": "Décomposition heuristique de référence (repli fail-closed)",
            "weights": serving.get("weights_heuristic"),
            "factors": serving.get("heuristic_reference_factors", []),
        }
        payload["factors"] = [
            f for f in payload["factors"] if f["feature"].startswith("Contribution ")
        ] or payload["factors"]

    else:
        # Repli heuristique fail-closed : score = indice pondéré explicable
        # (PAS une probabilité calibrée), raison du repli documentée.
        payload["mode"] = "HEURISTIC"
        payload["score_type"] = "WEIGHTED_HEURISTIC_INDEX"
        payload["calibration_status"] = "NOT_CALIBRATED"
        payload["fallback_reason"] = serving.get("fallback_reason")
        payload["weights_heuristic"] = serving.get("weights_heuristic")
    payload["data_origin"] = serving.get("data_origin")
    payload["validation_scope"] = serving.get("validation_scope")
    # Le score de risque a son PROPRE moteur : les métadonnées exposées
    # décrivent ce moteur (modele de risque calibre ou indice pondere), jamais
    # l'artefact du predicteur d'ecarts. Sinon l'interface attribuerait a tort
    # « gap_predictor_temporal » a un score produit par l'heuristique.
    risk_status: dict = {}
    try:
        risk_status = container.model_port.risk_ml_status() or {}
    except Exception:
        risk_status = {}
    risk_ml_active = bool(risk_status.get("risk_ml_active"))
    meta: dict = {
        "model_mode": model_mode,
        "model_version": risk_status.get("risk_model_version") if risk_ml_active else None,
        "model_name": "risk_predictor" if risk_ml_active else "weighted_heuristic_index",
        "risk_engine": "ML" if risk_ml_active else "HEURISTIC",
        "risk_engine_decision": risk_status.get("risk_decision"),
        "risk_fallback_reason": risk_status.get("risk_fallback_reason")
        or serving.get("fallback_reason"),
    }
    try:
        status = container.model_port.status()
        meta["target_validity"] = status.get("target_validity")
        meta["target_validity_label"] = status.get("target_validity_label")
        meta["data_origin"] = status.get("data_origin")
        meta["validation_scope"] = status.get("validation_scope")
        # Information croisée : moteur des ECARTS (celui dont les gaps
        # alimentent le score de risque), expose sous des cles distinctes.
        meta["gap_model_mode"] = status.get("mode")
        meta["gap_model_version"] = status.get("model_version")
        meta["gap_model_name"] = status.get("artifact_name") or status.get("model_name") or model_name
    except Exception:
        pass
    return ok(payload, meta)

