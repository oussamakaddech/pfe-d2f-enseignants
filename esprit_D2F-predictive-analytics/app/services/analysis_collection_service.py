"""Shared service for collecting analysis data used by both routers and scheduler.

This module centralizes data collection logic to eliminate duplication between
the /analyze/{enseignant_id} endpoint and the batch job scheduler.
"""

from app.services.data_service import DataService


def build_domaine_demand(besoins_demand: list[dict], total_besoins: int) -> dict[int, float]:
    """Build demand index: domaine_id → proportion of total demand.
    
    Args:
        besoins_demand: List of demand rows with 'competence_id' and 'total_demand'
        total_besoins: Sum of all demands (prevents division by zero)
    
    Returns:
        Dictionary mapping competence_id → demand ratio (0.0 to 1.0)
    """
    index: dict[int, float] = {}
    for row in besoins_demand:
        cid = row.get("competence_id")
        if not cid:
            continue
        total_d = int(row.get("total_demand") or 0)
        index[int(cid)] = total_d / max(total_besoins, 1)
    return index


def collect_analysis_data(svc: DataService, enseignant_id: str) -> dict:
    """Collect all required data for analysis pipeline.
    
    Centralizes the data retrieval logic used by both:
    - POST /api/v1/analytics/analyze/{enseignant_id} endpoint
    - Batch analysis job (scheduler.jobs._analyse_un_enseignant)
    
    Args:
        svc: DataService instance with database session
        enseignant_id: Teacher identifier
    
    Returns:
        Dictionary with keys:
        - comp_levels, req_levels, formations, form_comps
        - inscriptions, evaluations, eval_glob
        - besoins, certificats, prereqs, dom_demand
    
    Raises:
        Propagates any database or service errors
    """
    comp_levels = svc.get_competency_levels(enseignant_id)
    req_levels = svc.get_required_levels()
    formations = svc.get_all_formations()
    form_comps = svc.get_formation_competencies()
    inscriptions = svc.get_inscriptions(enseignant_id)
    evaluations = svc.get_evaluations(enseignant_id)
    eval_glob = svc.get_evaluations_globales()
    besoins = svc.get_besoins(enseignant_id)
    certificats = svc.get_certificats(enseignant_id)
    prereqs = svc.get_prerequisite_graph()
    demand = svc.get_besoin_demand()
    
    all_demand = sum(int(d.get("total_demand") or 0) for d in demand)
    dom_demand = build_domaine_demand(demand, all_demand)
    
    return {
        "comp_levels": comp_levels,
        "req_levels": req_levels,
        "formations": formations,
        "form_comps": form_comps,
        "inscriptions": inscriptions,
        "evaluations": evaluations,
        "eval_glob": eval_glob,
        "besoins": besoins,
        "certificats": certificats,
        "prereqs": prereqs,
        "dom_demand": dom_demand,
    }
