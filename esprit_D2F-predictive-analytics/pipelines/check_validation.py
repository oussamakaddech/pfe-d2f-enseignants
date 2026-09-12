"""Vérifie le rapport de validation final."""
import json
from pathlib import Path

report = json.loads(Path("reports/model_validation_report.json").read_text(encoding="utf-8"))
print("=== AUDIT METADATA ===")
for k, v in report["audit_metadata"].items():
    print(f"  {k}: {v}")

print()
print("=== GAP MODELS ===")
for name, model in report["gap_models"].items():
    if name in ("statistical_validation", "subgroup_metrics"):
        continue
    m = model.get("metrics", {})
    boot = model.get("bootstrap_ci", {})
    print(f"  {name}:")
    print(f"    RMSE={m.get('rmse', 'N/A')}, MAE={m.get('mae', 'N/A')}, R2={m.get('r2', 'N/A')}")
    print(f"    improvement={m.get('improvement_vs_persistence_pct', 'N/A')}%")
    print(f"    IC95={boot.get('improvement_pct_ci95', 'N/A')}")
    print(f"    status={model.get('serving_status', 'N/A')}")
    print(f"    n_train={model.get('n_train', 'N/A')}, n_val={model.get('n_val', 'N/A')}, n_test={model.get('n_test', 'N/A')}")
    print(f"    train_period={model.get('train_period', 'N/A')}")
    print(f"    val_period={model.get('val_period', 'N/A')}")
    print(f"    test_period={model.get('test_period', 'N/A')}")

print()
print("=== SERVING STATUS ===")
for k, v in report["serving_status"].items():
    print(f"  {k}: {v}")

print()
print("=== INCOHERENCES ===")
for inc in report["incoherence_report"]:
    print(f"  {inc['model']} {inc['metric']}: {inc['old_value']} -> {inc['new_value']}")