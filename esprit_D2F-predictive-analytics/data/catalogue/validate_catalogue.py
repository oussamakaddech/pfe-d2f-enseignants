import csv
import datetime as dt
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CAT = Path(__file__).resolve().parent
THRESHOLD_EXPIRED = dt.date(2026, 8, 1)
TODAY = dt.date(2026, 8, 18)


def read(name: str) -> list[dict]:
    with open(CAT / name, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def d(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def main() -> int:
    checks = []
    def check(label, ok, detail=""):
        checks.append((label, bool(ok), detail))

    domaines = read("domaines.csv")
    competences = read("competences.csv")
    savoirs = read("savoirs.csv")
    formations = read("formations.csv")
    fc = read("formation_competences.csv")
    insc = read("inscriptions_sample.csv")

    comp_by_id = {c["id"]: c for c in competences}

    # --- 1. Référentiel -----------------------------------------------------
    check("domaines.csv non vide (≥ 4 domaines)", len(domaines) >= 4)
    check("competences.csv 12 lignes", len(competences) == 12, f"got {len(competences)}")
    check("≥ 10 compétences couvertes", len(competences) >= 10)
    check("savoirs.csv 24 lignes (2/compétence)", len(savoirs) == 24, f"got {len(savoirs)}")
    dom_ids = {x["id"] for x in domaines}
    check("domaine_id des compétences référencé", all(c["domaine_id"] in dom_ids for c in competences))
    comp_ids = {c["id"] for c in competences}
    check("IDs compétence uniques", len(comp_ids) == len(competences))
    check("≥ 2 savoirs / compétence", all(
        sum(1 for s in savoirs if s["competence_id"] == c["id"]) >= 2 for c in competences))

    # --- 2. Formations ------------------------------------------------------
    check("≥ 24 formations", len(formations) >= 24, f"got {len(formations)}")
    check("ids formations 1001+", all(int(f["id"]) >= 1001 for f in formations))
    check("codes FOR-*", all(f["code"].startswith("FOR-") for f in formations))
    check("0 ID 'Txxx' (aucune formation)", all(not f["id"].startswith("T") for f in formations))
    n_expired = sum(1 for f in formations if d(f["date_fin"]) < THRESHOLD_EXPIRED)
    ratio = n_expired / len(formations) * 100
    check("10-20 % formations expirées (date_fin < 2026-08-01)",
          10 <= ratio <= 20, f"{ratio:.1f}%")
    check("PLANIFIÉE/OUVERTE ⇒ date_debut ≥ 2026-09-01",
          all(d(f["date_debut"]) >= dt.date(2026, 9, 1)
              for f in formations if f["etat_formation"] == "PLANIFIE"))
    check("EN_COURS chevauche aujourd'hui (2026-08-18)",
          all(d(f["date_debut"]) <= TODAY <= d(f["date_fin"])
              for f in formations if f["etat_formation"] == "EN_COURS"))
    check("etat_formation valide",
          all(f["etat_formation"] in {"PLANIFIE", "EN_COURS", "ACHEVE", "ANNULE"} for f in formations))
    check("period_code valide",
          all(f["period_code"] in {"WINTER", "SUMMER", "OTHER", "SPRINT", "WORKSHOP"} for f in formations))
    check("date_debut ≤ date_fin", all(d(f["date_debut"]) <= d(f["date_fin"]) for f in formations))
    check("sessions WINTER/SUMMER/OTHER/SPRINT/WORKSHOP présentes",
          len({f["period_code"] for f in formations}) >= 3)

    # --- 3. Formation ↔ compétences ------------------------------------------
    form_ids = {int(f["id"]) for f in formations}
    per_comp: dict[str, set[int]] = {}
    per_form: dict[int, set[str]] = {}
    for row in fc:
        fid, cid = int(row["formation_id"]), row["competence_id"]
        per_comp.setdefault(cid, set()).add(fid)
        per_form.setdefault(fid, set()).add(cid)
    check("≥ 3 formations / compétence tendue",
          all(len(v) >= 3 for v in per_comp.values()))
    check("0 formation sans compétence", set(per_form) == form_ids)
    check("0 compétence orpheline (toutes couvertes)", set(per_comp) == comp_ids)
    check("1-3 compétences / formation (jamais 10)",
          all(1 <= len(v) <= 3 for v in per_form.values()))
    check("niveau_prerequis ≤ niveau_vise",
          all(int(row["niveau_prerequis"]) <= int(row["niveau_vise"]) for row in fc))
    check("prerequis du référentiel ≤ niveau_vise",
          all(int(comp_by_id[row["competence_id"]]["prerequis"]) <= int(row["niveau_vise"])
              for row in fc))

    # --- 4. Inscriptions ------------------------------------------------------
    check("30-50 inscriptions", 30 <= len(insc) <= 50, f"got {len(insc)}")
    check("0 ID 'Txxx' dans inscriptions", all(not i["enseignant_id"].startswith("T") for i in insc))
    check("inscriptions vers formations connues",
          all(int(i["formation_id"]) in form_ids for i in insc))
    check("ENS001 : 2 formations suivies dans le passé (APPROVED)",
          sum(1 for i in insc if i["enseignant_id"] == "ENS001" and i["etat"] == "APPROVED") == 2)
    check("ENS002 : aucune inscription", all(i["enseignant_id"] != "ENS002" for i in insc))
    en_cours_form_ids = {int(f["id"]) for f in formations if f["etat_formation"] == "EN_COURS"}
    check("ENS003 : 1 formation en cours (APPROVED)",
          sum(1 for i in insc if i["enseignant_id"] == "ENS003"
              and i["etat"] == "APPROVED"
              and int(i["formation_id"]) in en_cours_form_ids) >= 1)

    n_pass = sum(1 for _, ok, _ in checks if ok)
    print("=" * 72)
    print(f"Catalogue D2F — checklist ({n_pass}/{len(checks)})")
    print("=" * 72)
    for label, ok, detail in checks:
        mark = "PASS" if ok else "FAIL"
        suffix = f"  [{detail}]" if detail else ""
        print(f"  [{mark}] {label}{suffix}")
    print("=" * 72)
    return 0 if n_pass == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())