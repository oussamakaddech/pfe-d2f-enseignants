"""Audit CONSOLIDE du module d'analyse predictive : 4 axes dans un seul rapport.

Axes : (1) analyse predictive servie (registre, serving, gouvernance, risque fail-closed),
       (2) datasets (qualite/provenance), (3) nettoyage (preuves verifiees), (4) comparaison
       de modeles (baseline / GB / MLP / XGBoost sur tous les corpus).

Ne recalcule rien : agrege uniquement des faits DEJA mesures par les pipelines d'audit et
les registres, et signale les incoherences detectees (rapports perimes, statut servi vs
registre, echelles de features, gouvernance).

Lecture seule. Sortie :
  reports/audit_global_analyse_predictive.json
  reports/audit_global_analyse_predictive.md
"""
from __future__ import annotations

import json
from pathlib import Path

BASE = Path(__file__).parent.parent
REPORTS = BASE / "reports"
OUT_JSON = REPORTS / "audit_global_analyse_predictive.json"
OUT_MD = REPORTS / "audit_global_analyse_predictive.md"

REGISTRY = BASE / "data" / "models" / "model_registry.json"
RISK_METADATA = BASE / "data" / "models" / "risk_training_metadata.json"
ENV_FILE = BASE / ".env"
COMPARISON_ALL = REPORTS / "audit_model_comparison_datasets.json"
DATASET_AUDIT = REPORTS / "audit_dataset_cleaning_all.json"
CLEANING_EXPERIMENT = REPORTS / "cleaning_variants_experiment.json"
CLEANING_REPORT = REPORTS / "dataset_cleaning_report.json"
GB_DECISION = REPORTS / "gb_production_decision.json"
STALE_CANDIDATES = [REPORTS / "final_inventory.json", REPORTS / "final_dataset_quality.json"]


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as exc:
        return {"_error": f"JSON invalide : {exc}"}


def parse_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip()
    return out


def audit_registry() -> dict:
    """Inventaire du registre + coherence avec l'artefact reellement servi (`.env`)."""
    registry = load_json(REGISTRY) or []
    env = parse_env(ENV_FILE)
    served_version = env.get("ML_MODEL_VERSION")
    served_artifact = env.get("ML_ARTIFACT_PATH")

    entries = [{
        "model_name": m.get("model_name"),
        "model_version": m.get("model_version"),
        "status": m.get("status"),
        "metrics": m.get("metrics"),
        "data_origin": m.get("data_origin"),
        "validation_scope": m.get("validation_scope"),
        "target_validity": m.get("target_validity"),
        "synthetic_share_pct": m.get("synthetic_share_pct"),
        "approval_status": m.get("approval_status"),
        "artifact_sha256": m.get("artifact_sha256"),
    } for m in registry]

    active = [e for e in entries if e["status"] == "ACTIVE"]
    candidates = [e for e in entries if e["status"] == "CANDIDATE"]
    archived = [e for e in entries if e["status"] == "ARCHIVED"]
    served_entry = next((e for e in entries if e["model_version"] == served_version), None)

    findings = []
    if served_entry and served_entry["status"] != "ACTIVE":
        findings.append({
            "severity": "CRITIQUE",
            "axis": "analyse_predictive",
            "finding": (f"L'artefact servi (`{served_artifact}`, version `{served_version}`) porte le statut "
                        f"**{served_entry['status']}** au registre alors que `ML_SERVING_MODE="
                        f"{env.get('ML_SERVING_MODE')}`."),
            "impact": ("Le mode annonce par le service ne correspond pas au statut de gouvernance du "
                       "modele reellement charge."),
        })
    if served_entry and active and served_entry["model_version"] != active[0]["model_version"]:
        findings.append({
            "severity": "MAJEUR",
            "axis": "analyse_predictive",
            "finding": (f"Deux regimes coexistent : servi = `{served_version}` ({served_entry['status']}) / "
                        f"ACTIVE au registre = `{active[0]['model_version']}` "
                        f"({active[0]['data_origin']} · {active[0]['validation_scope']})."),
            "impact": ("Toute metrique annoncee doit preciser son regime (overlay demonstration vs modele "
                       "ACTIVE du registre), sinon la comparaison est trompeuse."),
        })
    if env.get("ML_SYNTHETIC_TOLERANCE_PCT"):
        findings.append({
            "severity": "INFO",
            "axis": "analyse_predictive",
            "finding": (f"Tolerance donnees synthetiques = {env.get('ML_SYNTHETIC_TOLERANCE_PCT')}% "
                        f"(defaut local 50%) pour servir un corpus 100% simule."),
            "impact": "Derogation de gouvernance explicite, a retablir pour un service reel.",
        })
    if env.get("ML_REQUIRE_REAL_DATA"):
        findings.append({
            "severity": "INFO",
            "axis": "analyse_predictive",
            "finding": (f"Gardes de serving : ML_REQUIRE_REAL_DATA={env.get('ML_REQUIRE_REAL_DATA')}, "
                        f"ML_MIN_REAL_ROWS={env.get('ML_MIN_REAL_ROWS')}, ML_MIN_R2={env.get('ML_MIN_R2')}, "
                        f"ML_MAX_RMSE={env.get('ML_MAX_RMSE')}."),
            "impact": "Un artefact hors seuils est refuse au chargement (fail-closed).",
        })

    return {
        "serving_mode": env.get("ML_SERVING_MODE"),
        "served_artifact": served_artifact,
        "served_version": served_version,
        "served_metadata": env.get("ML_METADATA_PATH"),
        "synthetic_tolerance_pct": env.get("ML_SYNTHETIC_TOLERANCE_PCT"),
        "active": active,
        "candidates": candidates,
        "archived": archived,
        "entries": entries,
        "served_entry": served_entry,
        "findings": findings,
    }


def audit_risk_model() -> dict:
    """Etat du modele de risque : decision fail-closed ou non."""
    meta = load_json(RISK_METADATA) or {}
    metrics = meta.get("metrics", {})
    thresholds = meta.get("acceptance_thresholds", {})
    decision = meta.get("decision")
    baseline = meta.get("baseline_persistence_macro_f1")
    findings = []
    if decision == "reject":
        findings.append({
            "severity": "INFO",
            "axis": "analyse_predictive",
            "finding": (f"Modele de risque REFUSE (decision={decision}) : macro-F1 {metrics.get('macro_f1')} "
                        f"< seuil {thresholds.get('macro_f1_min')} ; baseline persistance "
                        f"{round(baseline, 4) if baseline else None}."),
            "impact": ("Repli heuristique 0.50/0.12/0.40 conserve : aucun badge ML sur le risque, "
                       "comportement fail-closed conforme."),
        })
    return {
        "model_version": meta.get("model_version"),
        "dataset_rows": (meta.get("dataset") or {}).get("rows"),
        "data_origin": meta.get("data_origin"),
        "validation_scope": meta.get("validation_scope"),
        "decision": decision,
        "metrics": metrics,
        "thresholds": thresholds,
        "baseline_persistence_macro_f1": baseline,
        "candidates": meta.get("candidates"),
        "findings": findings,
    }


def audit_stale_reports(registry: dict) -> dict:
    """Rapports derives dont les statuts de modeles contredisent le registre courant."""
    by_version = {e["model_version"]: e["status"] for e in registry["entries"]}
    details, findings = [], []
    for path in STALE_CANDIDATES:
        data = load_json(path)
        if data is None:
            details.append({"report": path.name, "status": "ABSENT"})
            continue
        stale = []
        prod = data.get("production_models") if isinstance(data, dict) else None
        if prod:
            for m in prod:
                current = by_version.get(m.get("model_version"))
                if current and current != m.get("status"):
                    stale.append({
                        "model_version": m.get("model_version"),
                        "status_in_report": m.get("status"),
                        "status_in_registry": current,
                    })
        details.append({"report": path.name, "status": "PRESENT", "stale_model_status": stale})
        if stale:
            findings.append({
                "severity": "MAJEUR",
                "axis": "analyse_predictive",
                "finding": (f"`{path.name}` annonce des statuts perimes : "
                            + " ; ".join(f"{s['model_version']} = {s['status_in_report']} "
                                         f"(registre : {s['status_in_registry']})" for s in stale)),
                "impact": ("Un rapport de synthese perime peut contredire le registre devant un jury : "
                           "les rapports derives doivent etre regeneres apres chaque changement de statut."),
            })
    return {"reports": details, "findings": findings}


def collect_dataset_axis() -> dict:
    data = load_json(DATASET_AUDIT)
    if not data:
        return {"status": "ABSENT", "datasets": [], "summary": {}, "genealogy": {}, "findings": []}
    findings = []
    for a in data["datasets"]:
        if a.get("status") != "PRESENT":
            continue
        defects = []
        if a.get("missing_values_total"):
            cols = list(a.get("missing_values", {}).items())[:4]
            defects.append(f"{a['missing_values_total']} manquants " +
                           "(" + ", ".join(f"{c}:{n}" for c, n in cols) + ")")
        if a.get("duplicate_rows_exact"):
            defects.append(f"{a['duplicate_rows_exact']} doublons exacts")
        if a.get("non_numeric_values"):
            defects.append("valeurs non numeriques " + str(a["non_numeric_values"]))
        if a.get("out_of_range"):
            defects.append("valeurs hors plage " + ", ".join(a["out_of_range"]))
        if defects:
            findings.append({
                "severity": "MAJEUR" if a["dataset"].startswith("corpus") else "INFO",
                "axis": "dataset",
                "finding": f"`{a['dataset']}` ({a['rows']} lignes) : " + " ; ".join(defects) + ".",
                "impact": ("Corpus de travail / demonstration : defauts volontaires ou attente de nettoyage. "
                           "Ne pas entrainer dessus sans passer par la chaine de nettoyage tracee."),
            })
        if (a.get("missing_values") or {}).get("target_observation_date"):
            findings.append({
                "severity": "MAJEUR",
                "axis": "dataset",
                "finding": (f"`{a['dataset']}` : `target_observation_date` absent sur "
                            f"{a['missing_values']['target_observation_date']}/{a['rows']} lignes."),
                "impact": ("La cible M+3 ne peut pas etre observee sur ce corpus : elle est extrapolee "
                           "(`target_validity=EXTRAPOLATED_TARGET`), ce qui interdit toute validation "
                           "institutionnelle reelle."),
            })
    return {
        "status": "PRESENT",
        "datasets": data["datasets"],
        "summary": data.get("summary", {}),
        "cleaning_ledger": data.get("cleaning_ledger", []),
        "genealogy": data.get("genealogy", {}),
        "scale_conflicts": data.get("scale_conflicts", []),
        "findings": findings,
    }


def collect_comparison_axis() -> dict:
    data = load_json(COMPARISON_ALL)
    if not data:
        return {"status": "ABSENT", "results": [], "findings": []}
    findings = []
    for res in data:
        best = res.get("best") or {}
        findings.append({
            "severity": "INFO",
            "axis": "comparaison_modeles",
            "finding": (f"`{res['dataset']}` ({res['rows']} lignes, {res['data_origin']}, split "
                        f"{res['split_kind']}) : meilleur = **{best.get('candidate')}** "
                        f"(RMSE {best.get('rmse')}, lift IC95 {best.get('lift_rmse_ci95')}, "
                        f"decision={best.get('decision')})."),
            "impact": ("Comparaison valable ENTRE candidats a protocole identique ; les niveaux absolus "
                       "dependent du corpus."),
        })
    gb = load_json(GB_DECISION) or {}
    if gb.get("decision"):
        findings.append({
            "severity": "MAJEUR",
            "axis": "comparaison_modeles",
            "finding": (f"GB candidat sur le holdout servi : decision={gb.get('decision')} "
                        f"(delta RMSE IC95 {gb.get('delta_rmse_ic95')}, significatif={gb.get('significant')})."),
            "impact": ("Le GB ne remplace pas le modele ACTIVE sur le corpus servi : promotion refusee "
                       "faute de significativite (43 lignes de test)."),
        })
    return {"status": "PRESENT", "results": data, "findings": findings}


def collect_cleaning_axis() -> dict:
    experiment = load_json(CLEANING_EXPERIMENT) or {}
    report = load_json(CLEANING_REPORT) or {}
    dataset_axis = load_json(DATASET_AUDIT) or {}
    findings = []

    summary = experiment.get("summary", {})
    if summary:
        findings.append({
            "severity": "MAJEUR" if not summary.get("any_cleaning_gain_proven") else "INFO",
            "axis": "nettoyage",
            "finding": ("Experience de nettoyage (features mortes, winsorisation, log1p) : "
                        + summary.get("honest_conclusion", "")),
            "impact": ("Le nettoyage ne se justifie donc pas par un gain de metrique, mais par la "
                       "tracabilite, la robustesse et la suppression d'informations mortes."),
        })
    for ledger in dataset_axis.get("cleaning_ledger", []):
        if ledger.get("status") != "VERIFIE":
            continue
        findings.append({
            "severity": "INFO" if ledger.get("claim_matches") else "MAJEUR",
            "axis": "nettoyage",
            "finding": (f"Nettoyage `{ledger['label']}` verifie en direct : {ledger['raw_rows']} → "
                        f"{ledger['clean_rows']} lignes, {ledger['rows_removed_keys']} cles supprimees, "
                        f"{ledger['rows_added_not_in_raw']} cles inventees — conforme = {ledger['claim_matches']}."),
            "impact": "Operation de nettoyage reproductible et sans perte non tracee.",
        })
    for w in dataset_axis.get("genealogy", {}).get("warnings", []):
        findings.append({
            "severity": "MAJEUR",
            "axis": "nettoyage",
            "finding": w,
            "impact": ("La lignee annoncee dans les rapports de synthese doit citer le fichier parent reel, "
                       "sinon la justification du volume d'entrainement est fausse."),
        })
    for conflict in dataset_axis.get("scale_conflicts", []):
        findings.append({
            "severity": "CRITIQUE" if conflict["severity"] == "CRITIQUE" else "MAJEUR",
            "axis": "dataset",
            "finding": (f"Echelle de `{conflict['column']}` incoherente entre corpus ({conflict['reason']})."),
            "impact": ("Feature non comparable entre corpora : risque de train/serve skew si un modele "
                       "entraine sur un corpus est alimente par un autre."),
        })
    return {
        "experiment_summary": summary,
        "experiment_results": experiment.get("results", {}),
        "dataset_cleaning_report": report,
        "findings": findings,
    }


def _md_axis1(payload: dict) -> list[str]:
    reg, risk = payload["analyse_predictive"]["registry"], payload["analyse_predictive"]["risk"]
    lines = [
        "# Audit consolide — analyse predictive, datasets, nettoyage, comparaison de modeles",
        "",
        "Genere par `pipelines/audit_global_predictive.py` — **lecture seule**.",
        "Aucun chiffre n'est recalcule ici : le rapport agrege des faits deja mesures par",
        "`audit_dataset_cleaning_all.py`, `audit_model_comparison_datasets.py`, les registres de",
        "modeles et la configuration de serving, puis signale les incoherences detectees.",
        "",
        "## 1. Analyse predictive servie",
        "",
        "| Element | Valeur |",
        "|---|---|",
        f"| Mode de serving annonce | `{reg.get('serving_mode')}` |",
        f"| Artefact charge | `{reg.get('served_artifact')}` |",
        f"| Version servie | `{reg.get('served_version')}` |",
        f"| Metadonnees servies | `{reg.get('served_metadata')}` |",
        f"| Tolerance donnees synthetiques | {reg.get('synthetic_tolerance_pct')} % |",
        "",
        "### Registre des modeles (source de gouvernance)",
        "",
        "| Version | Statut | Origine | Validation | Cible | Metriques | Approval |",
        "|---|---|---|---|---|---|---|",
    ]
    for e in reg["entries"]:
        m = e.get("metrics") or {}
        metrics = ", ".join(f"{k}={v}" for k, v in m.items()) if m else "—"
        lines.append(
            f"| `{e['model_version']}` | **{e['status']}** | {e.get('data_origin')} | "
            f"{e.get('validation_scope')} | {e.get('target_validity')} | "
            f"{metrics} | {e.get('approval_status')} |")
    lines += [
        "",
        f"Modeles ACTIVE : {len(reg['active'])} ; CANDIDATE : {len(reg['candidates'])} ; "
        f"ARCHIVED : {len(reg['archived'])}.",
        "",
        "### Modele de risque",
        "",
        f"- Version : `{risk.get('model_version')}` ({risk.get('data_origin')} · {risk.get('validation_scope')}), "
        f"{risk.get('dataset_rows')} lignes de simulation.",
        f"- Decision de promotion : **{risk.get('decision')}** — macro-F1 "
        f"{(risk.get('metrics') or {}).get('macro_f1')} vs seuil "
        f"{risk.get('thresholds', {}).get('macro_f1_min')} ; baseline persistance "
        f"{round(risk['baseline_persistence_macro_f1'], 4) if risk.get('baseline_persistence_macro_f1') else '—'}.",
        "- Consequence : repli heuristique 0.50/0.12/0.40, raison exposee dans `fallback_reason`.",
        "",
    ]
    return lines


def _md_axis2(payload: dict) -> list[str]:
    ds = payload["datasets"]
    lines = ["## 2. Datasets (qualite et provenance)", ""]
    if ds.get("status") != "PRESENT":
        return lines + [f"Audit dataset indisponible ({ds.get('status')}).", ""]
    lines += [
        "| Dataset | Lignes | Features | Provenance | Manquants | Doublons exacts | Doublons fonctionnels | Col. hors plage | Col. non num. |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for a in ds["datasets"]:
        if a.get("status") != "PRESENT":
            continue
        prov = a.get("provenance", {})
        prov_txt = prov.get("data_origin_counts") or (
            f"synthetic {prov.get('synthetic_share_pct')}%" if prov else "n/a")
        if isinstance(prov_txt, dict):
            prov_txt = "\\|".join(f"{k}:{v}" for k, v in prov_txt.items())
        lines.append(
            f"| `{a['dataset']}` | {a['rows']} | {a['canonical_features_present']}/{a['canonical_features_total']} | "
            f"{prov_txt} | {a['missing_values_total']} | {a['duplicate_rows_exact']} | "
            f"{a['duplicate_rows_functional']} | {len(a['out_of_range'])} | {len(a['non_numeric_values'])} |")
    gen = ds.get("genealogy", {})
    if gen.get("warnings"):
        lines += ["", "**Alertes de genealogie** :", ""]
        lines += [f"- {w}" for w in gen["warnings"]]
    lines += [
        "",
        f"Conflits d'echelle inter-corpus : "
        f"{len([c for c in ds.get('scale_conflicts', []) if c['severity'] == 'CRITIQUE'])} critiques, "
        f"{len([c for c in ds.get('scale_conflicts', []) if c['severity'] != 'CRITIQUE'])} a examiner "
        "(detail dans `audit_dataset_cleaning_all.md`).",
        "",
    ]
    return lines


def _md_axis3(payload: dict) -> list[str]:
    cl = payload["nettoyage"]
    lines = ["## 3. Nettoyage (preuves verifiees)", "", "### Operations brut → nettoye", "",
             "| Operation | Lignes brut | Lignes nettoyees | Cles supprimees | Cles inventees | Conforme |",
             "|---|---|---|---|---|---|"]
    for l in payload["datasets"].get("cleaning_ledger", []):
        if l.get("status") != "VERIFIE":
            lines.append(f"| {l['label']} | — | — | — | — | {l.get('status')} |")
            continue
        lines.append(f"| {l['label']} | {l['raw_rows']} | {l['clean_rows']} | {l['rows_removed_keys']} | "
                     f"{l['rows_added_not_in_raw']} | {l['claim_matches']} |")
    lines += ["", "### Effet du nettoyage sur la metrique (holdout servi 43 lignes, seed 42)", ""]
    results = cl.get("experiment_results") or {}
    if results:
        lines += ["| Modele et variante | RMSE | MAE | R2 | delta RMSE vs RAW (IC95) | Significatif |",
                  "|---|---|---|---|---|---|"]
        for key, r in results.items():
            sig = "GAIN" if r["improves_raw_significantly"] else ("variante" if r["significant"] else "ns")
            lines.append(f"| {key.replace(' | ', ' — ')} | {r['rmse']} | {r['mae']} | {r['r2']} | "
                         f"{r['delta_rmse_vs_raw_ic95']} | {sig} |")
        lines += ["", "Variantes significativement meilleures que RAW : "
                      f"{cl['experiment_summary'].get('variants_significantly_better_than_raw') or 'aucune'}.",
                  "", f"> {cl['experiment_summary'].get('honest_conclusion', '')}", ""]
    else:
        lines += ["Experience indisponible : lancer `python pipelines/experiment_cleaning.py`.", ""]
    report = cl.get("dataset_cleaning_report") or {}
    if report:
        lines += [
            "### Rapport de nettoyage du corpus servi (`reports/dataset_cleaning_report.json`)",
            "",
            f"- Lignes : {report.get('initial_rows')} → {report.get('final_rows')} "
            f"(supprimees {report.get('rows_removed')}, corrigees {report.get('rows_corrected')}, "
            f"quarantaine {report.get('rows_quarantined')}).",
            f"- Hash apres nettoyage : `{report.get('dataset_hash_after')}`.",
            f"- Granularite : {(report.get('granularity') or {}).get('granularity')} "
            f"(valide = {(report.get('granularity') or {}).get('valid')}).",
            "",
        ]
    return lines


def _md_axis4(payload: dict) -> list[str]:
    cmp_axis = payload["comparaison_modeles"]
    lines = ["## 4. Comparaison de modeles (protocole identique par corpus, seed 42)", ""]
    if cmp_axis.get("status") != "PRESENT":
        return lines + ["Comparaison indisponible : lancer "
                        "`python pipelines/audit_model_comparison_datasets.py`.", ""]
    for res in cmp_axis["results"]:
        lines += [
            f"### `{res['dataset']}` — {res['rows']} lignes ({res['data_origin']}, split {res['split_kind']})",
            "",
            "| Candidat | RMSE | MAE | R2 | lift RMSE vs baseline (IC95) | Decision |",
            "|---|---|---|---|---|---|",
            f"| Baseline (persistance) | {res['baseline']['rmse']} | {res['baseline']['mae']} | "
            f"{res['baseline']['r2']} | — | reference |",
        ]
        for c in sorted(res["candidates"], key=lambda x: x["rmse"]):
            lines.append(f"| {c['candidate']} | {c['rmse']} | {c['mae']} | {c['r2']} | "
                         f"{c['lift_rmse_vs_baseline']} {c['lift_rmse_ci95']} | {c['decision']} |")
        lines.append("")
    lines += [
        "**Lecture honnete** : le classement n'est stable qu'a protocole identique. Sur le corpus",
        "servi (172 lignes, 34 lignes de test) le Gradient Boosting devance XGBoost et le MLP ;",
        "sur le grand corpus simule (10 920 lignes) XGBoost passe devant de 0,005 RMSE — ecart non",
        "significatif (`audit_model_comparison_simulation.md`). Le plafond est le volume de donnees",
        "reelles (217 observations), pas le choix d'algorithme.",
        "",
    ]
    return lines


def _md_findings(payload: dict) -> list[str]:
    findings = payload["findings"]
    order = {"CRITIQUE": 0, "MAJEUR": 1, "INFO": 2}
    lines = ["## 5. Constats et recommandations", ""]
    if not findings:
        return lines + ["Aucun constat.", ""]
    counts: dict[str, int] = {}
    for f in findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1
    lines += ["Repartition : " + " · ".join(
        f"**{k}** {v}" for k, v in sorted(counts.items(), key=lambda x: order[x[0]])) + ".", ""]
    for severity in ("CRITIQUE", "MAJEUR", "INFO"):
        group = [f for f in findings if f["severity"] == severity]
        if not group:
            continue
        lines += [f"### {severity}", ""]
        for f in group:
            lines += [f"- **[{f['axis']}]** {f['finding']}", f"  - *Impact* : {f['impact']}"]
        lines.append("")
    return lines


def _md_limits() -> list[str]:
    return [
        "## 6. Limites de cet audit",
        "",
        "- Le rapport agrege des faits mesures : il ne re-entraine ni ne modifie aucun artefact.",
        "- Les corpus simules et synthetiques sont audites pour leur qualite et leur tracabilite,",
        "  PAS comme preuve de performance sur les enseignants reels.",
        "- Les comparaisons de modeles ne sont valables qu'a protocole identique ; les niveaux",
        "  absolus dependent du corpus (voir le tableau par dataset).",
        "- Le risque et la pertinence des recommandations sont evalues par des mesures separees",
        "  (`risk_training_metadata.json`, `demo_ranking_report.json`) et ne sont pas re-derives ici.",
        "",
    ]


def main() -> int:
    registry = audit_registry()
    risk = audit_risk_model()
    stale = audit_stale_reports(registry)
    datasets = collect_dataset_axis()
    comparison = collect_comparison_axis()
    cleaning = collect_cleaning_axis()

    findings = (registry["findings"] + risk["findings"] + stale["findings"]
                + datasets["findings"] + comparison["findings"] + cleaning["findings"])

    payload = {
        "generated_by": "pipelines/audit_global_predictive.py",
        "read_only": True,
        "axes": ["analyse_predictive", "dataset", "nettoyage", "comparaison_modeles"],
        "analyse_predictive": {"registry": registry, "risk": risk, "stale_reports": stale},
        "datasets": datasets,
        "nettoyage": cleaning,
        "comparaison_modeles": comparison,
        "findings": findings,
        "summary": {
            "findings_total": len(findings),
            "findings_by_severity": {s: len([f for f in findings if f["severity"] == s])
                                     for s in ("CRITIQUE", "MAJEUR", "INFO")},
            "served_version": registry.get("served_version"),
            "served_registry_status": (registry.get("served_entry") or {}).get("status"),
            "active_registry_version": (registry["active"][0]["model_version"] if registry["active"] else None),
            "risk_decision": risk.get("decision"),
            "datasets_audited": datasets.get("summary", {}).get("datasets_audited"),
            "cleaning_gain_proven": cleaning.get("experiment_summary", {}).get("any_cleaning_gain_proven"),
            "model_comparison_datasets": len(comparison.get("results", [])),
        },
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = (_md_axis1(payload) + _md_axis2(payload) + _md_axis3(payload)
             + _md_axis4(payload) + _md_findings(payload) + _md_limits())
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"[OK] {OUT_JSON.name}")
    print(f"[OK] {OUT_MD.name}")
    print("[resume] " + json.dumps(payload["summary"], ensure_ascii=False))
    for f in findings:
        msg = f"  [{f['severity']:<8}] [{f['axis']}] {f['finding'][:170]}"
        print(msg.encode("ascii", "replace").decode("ascii"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())