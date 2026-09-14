"""Verification de chaque modele et accuracy — synthese des rapports finaux (offline, sans Docker)."""
import json, pathlib, sys
import joblib
import numpy as np

base = pathlib.Path(__file__).resolve().parents[1]

def section(t): print(f"\n{'='*72}\n{t}\n{'='*72}")

# 1. Artifacts
section("1) ARTIFACTS data/models/")
for p in sorted((base / "data" / "models").glob("*")):
    kb = round(p.stat().st_size/1024, 1)
    print(f"  {p.name:40} {kb:>8} KB")

# 2. Registre production
section("2) REGISTRE PRODUCTION — model_registry.json")
reg = json.loads((base / "data" / "models" / "model_registry.json").read_text(encoding="utf-8"))
for m in reg:
    print(f"  {m['model_version']:8} | status={m['status']:9} | approval={m['approval_status']:9} | "
          f"RMSE {m['metrics']['rmse']:.4f} | MAE {m['metrics']['mae']:.4f} | R2 {m['metrics']['r2']:+.4f} | "
          f"synth {m['synthetic_share_pct']}% | hash {m['artifact_sha256'][:10]}...")

# 3. final_model_choice — corpus DEMO 100% synthetique (1k lignes, split 664/154/182)
section("3) CORPUS DEMO 100% SYNTHETIQUE — reports/final_model_choice.json")
print("   Protocole: temporel 3-way, seed 42, n_bootstrap 1000, multi-seed [10,20,42,99,2026], target gap_next_3m, 29 features")
print("   Source: demo-gap-synthetic-v1.0.0 (is_synthetic=true, NE JAMAIS presenter comme perf ESPRIT)")
fc = json.loads((base / "reports" / "final_model_choice.json").read_text(encoding="utf-8"))
for r in fc["metriques_gap"]:
    print(f"  {r['Modèle']:22} | RMSE {r['RMSE']:.4f} | MAE {r['MAE']:.4f} | R2 {r['R²']:+.4f} | "
          f"tol±0.10 {r['Tolérance ±0,10']:.3f} | tol±0.20 {r['Tolérance ±0,20']:.3f} | "
          f"gain {r['Gain vs baseline (%)']:+6.1f}% | {r['Temps inférence (ms)']:.2f}ms | {r['Décision']}")
print("\n  Multi-seed stabilite (mlp): std RMSE 0.0306, std R2 0.0534")
print("  Bootstrap IC95 gain vs persistence (mlp, n=1000): [18.76%, 43.42%] > 0 => significatif")
print(f"  DECISION: BEST_DEMO_MODEL = {fc['decision']['best_demo_model']} — {fc['decision']['justification']}")

# 4. final_ml_validation — corpus INSTITUTIONNEL v1.0.0 (107 lignes) et v1.1.0 (172 lignes)
section("4) CORPUS INSTITUTIONNEL — reports/final_ml_validation.json (v1.0.0=107 lignes, v1.1.0=172 lignes)")
vm = json.loads((base / "reports" / "final_ml_validation.json").read_text(encoding="utf-8"))
for ver in ["v1.0.0", "v1.1.0"]:
    d = vm["versions_protocol_80_20"][ver]
    print(f"\n  [{ver}] baseline persistence RMSE {d['baseline']['baseline_rmse']:.4f} | best_cv={d['best_model']}")
    for mn in ["gradient_boosting","mlp","xgboost"]:
        md = d["models"][mn]
        ci = md["bootstrap_ci"]
        print(f"    {mn:20} RMSE {md['metrics']['rmse']:.4f} | MAE {md['metrics']['mae']:.4f} | R2 {md['metrics']['r2']:+.4f} | "
              f"gain {md['metrics']['improvement_vs_persistence_pct']:.1f}% | IC95 RMSE {ci['rmse_ci95']} | n={md['metrics']['n_predictions']}")
print("\n  COMMON_3way (v1.1.0 union, split commun n_train=104/val=34/test=34):")
cm = vm["common_protocol"]
for k in ["v1.0.0","v1.1.0","gradient_boosting","mlp","xgboost"]:
    md = cm["models"][k]
    print(f"    {k:20} RMSE {md['metrics']['rmse']:.4f} | R2 {md['metrics']['r2']:+.4f} | gain {md['metrics']['improvement_vs_persistence_pct']:.1f}% | {md['serving_status']}")

# 5. Inference sanity (offline, sans BD)
section("5) SANITY INFERENCE OFFLINE (zeros, 29 features)")
for name, path in [("v1.0.0 ACTIVE","data/models/gap_predictor_temporal.joblib"),
                   ("v1.1.0 CANDIDATE","data/models/gap_predictor_temporal_v110.joblib")]:
    p = base / path
    if not p.exists():
        print(f"  {name}: artefact absent ({path})")
        continue
    try:
        pipe = joblib.load(p)
        X = np.zeros((1, 29))
        pred = pipe.predict(X)
        print(f"  {name}: predict(zeros)={pred[0]:.4f} OK | steps={list(pipe.named_steps.keys()) if hasattr(pipe,'named_steps') else type(pipe)}")
    except Exception as e:
        print(f"  {name}: ERREUR {e}")

# 6. Autres familles (risk/ranking)
section("6) RISQUE & RANKING — reports/model_validation_report.json")
mr = json.loads((base / "reports" / "model_validation_report.json").read_text(encoding="utf-8"))
print("  GAP (regression):")
for k in ["baseline_persistence","gradient_boosting","xgboost","mlp"]:
    m = mr["gap_models"][k]
    print(f"    {k:22} RMSE {str(m['metrics']['rmse']):8} | R2 {str(m['metrics']['r2']):8} | {m['serving_status']}")
print("  RISQUE: heuristic_six_factors KEEP_AS_BASELINE (accuracy N/A, seuils 30/70), random_forest NOT_AVAILABLE (risk_classifier.joblib absent)")
print("  RANKING: heuristic_weighted_sum KEEP_AS_BASELINE (P@k N/A), relevance_model NOT_AVAILABLE (artefact absent)")

section("SYNTHESE ACCURACY")
print("  PRODUCTION (seul servi, PRODUCTION_ML v1.0.0 ACTIVE): RMSE 0.9883, MAE 0.6388, R2 0.1897")
print("  DEMO (jamais promu, DEMO_ML mlp): RMSE 0.7402, MAE 0.4316, R2 0.3495, gain 33.9% vs persistence, IC95 gain [18.8%,43.4%]")
print("  INSTITUTIONNEL v1.1.0 CANDIDATE (172 lignes): pas meilleur que v1.0.0 (RMSE 1.0625 vs 0.9883) => NON PROMU")
print("  Risque/Ranking ML: NON DISPONIBLES — heuristiques conservees (explicables, prioritaires sur prediction)")
