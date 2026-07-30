"""Pipeline principal D2F - execute toutes les etapes de generation et validation."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from generate_d2f_dataset import main as generate_data
from run_qa_checks import run_all_checks


def main():
    print("=" * 60)
    print("PIPELINE D2F - Generation et Validation du Dataset")
    print("=" * 60)
    
    print("\n[1] Generation du dataset...")
    generate_data()
    
    print("\n[2] Validation QA...")
    passed = run_all_checks()
    
    print("\n" + "=" * 60)
    if passed:
        print("[OK] PIPELINE REUSSI - Dataset pret pour utilisation")
    else:
        print("[ERREUR] PIPELINE ECHOUÉ - Corriger les erreurs ci-dessus")
    print("=" * 60)
    
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())