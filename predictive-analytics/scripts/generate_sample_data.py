"""Génère un jeu de données D2F de démonstration (ENSxxx only, déterministe).

Usage: python scripts/generate_sample_data.py [raw_dir]
"""

from __future__ import annotations

import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

SEED = 42


def generate(raw_dir: Path) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(SEED)
    today = date.today()

    # ------------------------------------------------------------ enseignants
    departments = {
        "GL": ("Génie Logiciel", "UP-GL"),
        "INFO": ("Informatique", "UP-INFO"),
        "RT": ("Réseaux & Cybersécurité", "UP-RT"),
        "GC": ("Génie Civil", "UP-GC"),
        "GBA": ("Génie Biologique", "UP-GBA"),
        "MECA": ("Mécanique", "UP-MECA"),
    }
    first = ["Zineb", "Youssef", "Tarik", "Fatima", "Sara", "Ahmed", "Lina", "Karim", "Nadia", "Omar"]
    last = ["Bouaziz", "Rachedi", "Haddi", "Habbal", "Benali", "Ziani", "El Amrani", "Mansouri", "Cherif", "Kacem"]

    teachers_rows = []
    for i in range(1, 31):
        tid = f"ENS{i:03d}"
        dept_code, (dept_name, up_code) = list(departments.items())[i % len(departments)]
        teachers_rows.append(
            {
                "teacher_id": tid,
                "full_name": f"{first[i % len(first)]} {last[(i * 3) % len(last)]}",
                "department_code": dept_code,
                "department_name": dept_name,
                "up_code": up_code,
                "role": "TEACHER",
                "status": "ACTIVE",
                "hire_date": (today - timedelta(days=rng.randint(90, 1200))).isoformat(),
            }
        )
    pd.DataFrame(teachers_rows).to_csv(raw_dir / "teachers.csv", index=False)

    # -------------------------------------------------------- référentiel savoirs
    domains = [
        ("DOM-INFO", "INFO", "Informatique"),
        ("DOM-RT", "RT", "Réseaux & Sécurité"),
        ("DOM-GC", "GC", "Génie Civil"),
        ("DOM-PED", "PED", "Pédagogie"),
        ("DOM-GEST", "GEST", "Management"),
    ]
    competencies = [
        ("COMP-ALGO", "ALGO", "Algorithmique", "DOM-INFO"),
        ("COMP-BD", "BD", "Bases de Données", "DOM-INFO"),
        ("COMP-WEB", "WEB", "Développement Web", "DOM-INFO"),
        ("COMP-RES", "RESEAU", "Réseaux", "DOM-RT"),
        ("COMP-SEC", "SEC", "Sécurité Informatique", "DOM-RT"),
        ("COMP-STRU", "GC_STRU", "Structures", "DOM-GC"),
        ("COMP-MAT", "GC_MAT", "Matériaux", "DOM-GC"),
        ("COMP-PED", "PED", "Pédagogie Active", "DOM-PED"),
        ("COMP-PROJ", "GESTION", "Gestion de Projet", "DOM-GEST"),
        ("COMP-ANG", "ANG", "Langues", "DOM-PED"),
    ]
    sub_competencies = [
        ("SUB-ALGO-BASE", "ALGO_BASE", "Algorithmes fondamentaux", "COMP-ALGO"),
        ("SUB-ALGO-ADV", "ALGO_ADV", "Algorithmes avancés", "COMP-ALGO"),
        ("SUB-BD-MOD", "BD_MOD", "Modélisation", "COMP-BD"),
        ("SUB-BD-DE", "BD_DE", "Data Engineering", "COMP-BD"),
        ("SUB-WEB-F", "WEB_F", "Frontend", "COMP-WEB"),
        ("SUB-WEB-B", "WEB_B", "Backend", "COMP-WEB"),
        ("SUB-RES-IP", "RES_IP", "TCP/IP", "COMP-RES"),
        ("SUB-SEC-BASE", "SEC_BASE", "Sécurité de base", "COMP-SEC"),
        ("SUB-STRU-BIM", "GC_BIM", "BIM", "COMP-STRU"),
        ("SUB-MAT-DUR", "GC_DUR", "Durabilité", "COMP-MAT"),
        ("SUB-PED-ACT", "PED_ACT", "Pédagogie par compétences", "COMP-PED"),
        ("SUB-PROJ-AGI", "PROJ_AGI", "Méthodes agiles", "COMP-PROJ"),
    ]
    knowledges = [
        ("KN-ALGO-1", "ALGO_BASE", "Algorithmes fondamentaux", "SUB-ALGO-BASE", "THEORETICAL", 4, []),
        ("KN-ALGO-2", "ALGO_ADV", "Récursivité & complexité", "SUB-ALGO-ADV", "PRACTICAL", 4, ["KN-ALGO-1"]),
        ("KN-BD-1", "BD_MOD", "Modélisation relationnelle", "SUB-BD-MOD", "THEORETICAL", 3, []),
        ("KN-BD-2", "BD_DE", "Pipelines data", "SUB-BD-DE", "PRACTICAL", 4, ["KN-BD-1"]),
        ("KN-WEB-1", "WEB_F", "React & SPA", "SUB-WEB-F", "PRACTICAL", 3, []),
        ("KN-WEB-2", "WEB_B", "APIs & microservices", "SUB-WEB-B", "PRACTICAL", 4, ["KN-WEB-1"]),
        ("KN-RES-1", "RES_IP", "Architecture TCP/IP", "SUB-RES-IP", "THEORETICAL", 3, []),
        ("KN-SEC-1", "SEC_BASE", "Sécurité applicative", "SUB-SEC-BASE", "THEORETICAL", 4, ["KN-RES-1"]),
        ("KN-GC-1", "GC_BIM", "BIM & modélisation 3D", "SUB-STRU-BIM", "PRACTICAL", 3, []),
        ("KN-GC-2", "GC_DUR", "Matériaux durables", "SUB-MAT-DUR", "THEORETICAL", 3, []),
        ("KN-PED-1", "PED_ACT", "Pédagogie par compétences", "SUB-PED-ACT", "THEORETICAL", 3, []),
        ("KN-PROJ-1", "PROJ_AGI", "Scrum & Kanban", "SUB-PROJ-AGI", "PRACTICAL", 3, []),
    ]
    required_rows = []
    for k in knowledges:
        kn_id, code, name, sub_id, ktype, req_level, prereqs = k
        sub = next(s for s in sub_competencies if s[0] == sub_id)
        comp = next(c for c in competencies if c[0] == sub[3])
        dom = next(d for d in domains if d[0] == comp[3])
        required_rows.append(
            {
                "knowledge_id": kn_id,
                "knowledge_code": code,
                "knowledge_name": name,
                "knowledge_type": ktype,
                "sub_competency_id": sub_id,
                "sub_competency_name": sub[2],
                "competency_id": comp[0],
                "competency_name": comp[2],
                "domain_id": dom[0],
                "domain_name": dom[2],
                "required_level": req_level,
                "is_critical": req_level >= 4,
                "prereq_knowledge_ids": "|".join(prereqs),
            }
        )
    pd.DataFrame(required_rows).to_csv(raw_dir / "required_levels.csv", index=False)

    # ------------------------------------------------------------- catalogue
    catalog = [
        ("F001", "Maîtrise des algorithmes avancés", ["KN-ALGO-2"], 4, 3, 24.0),
        ("F002", "Architecture logicielle orientée services", ["KN-WEB-2"], 4, 3, 30.0),
        ("F003", "Data Engineering et pipelines", ["KN-BD-2"], 4, 3, 28.0),
        ("F004", "Cybersécurité appliquée", ["KN-SEC-1"], 4, 3, 26.0),
        ("F005", "Développement full-stack React", ["KN-WEB-1", "KN-WEB-2"], 3, 3, 40.0),
        ("F006", "BIM et modélisation 3D", ["KN-GC-1"], 3, 3, 22.0),
        ("F007", "Pédagogie active par compétences", ["KN-PED-1"], 3, 2, 18.0),
        ("F008", "Management de projet agile", ["KN-PROJ-1"], 3, 2, 20.0),
        ("F009", "Architecture réseau et sécurité TCP/IP", ["KN-RES-1", "KN-SEC-1"], 4, 3, 32.0),
        ("F010", "Matériaux de construction et durabilité", ["KN-GC-2"], 3, 3, 21.0),
        ("F011", "Anglais technique et communication", ["KN-PED-1"], 3, 2, 16.0),
        ("F012", "Introduction à la cybersécurité réseau", ["KN-RES-1"], 3, 3, 14.0),
        ("F013", "Modélisation de bases de données avancée", ["KN-BD-1"], 3, 3, 15.0),
        ("F014", "Algorithmique fondamentale pour enseignants", ["KN-ALGO-1"], 4, 2, 20.0),
    ]
    catalog_rows = []
    links_rows = []
    for idx, (fid, title, kn_ids, niveau_vise, prereq_lv, hours) in enumerate(catalog):
        start = today + timedelta(days=10 + idx * 15)
        open_ = idx % 3 != 0  # F003, F006, F009... closed
        catalog_rows.append(
            {
                "training_id": fid,
                "title": title,
                "state": "PLANIFIE",
                "active": True,
                "cancelled": False,
                "registration_open": open_,
                "training_type": "INTERNE" if idx % 2 == 0 else "EXTERNE",
                "start_date": start.isoformat(),
                "end_date": (start + timedelta(days=5)).isoformat(),
                "duration_hours": hours,
                "department_code": "",
                "up_code": "",
                "role": "",
                "capacity": 20 + idx,
                "registration_count": rng.randint(0, 20),
                "prereq_training_ids": "",
                "available_from": start.isoformat(),
            }
        )
        for kn in kn_ids:
            links_rows.append(
                {
                    "training_id": fid,
                    "knowledge_id": kn,
                    "niveau_prerequis": prereq_lv,
                    "niveau_vise": niveau_vise,
                }
            )
    pd.DataFrame(catalog_rows).to_csv(raw_dir / "training_catalog.csv", index=False)
    pd.DataFrame(links_rows).to_csv(raw_dir / "training_competency_links.csv", index=False)

    # ------------------------------------------------------ compétences enseignants
    comp_rows = []
    knowledge_ids = [k[0] for k in knowledges]
    for tid in [f"ENS{i:03d}" for i in range(1, 31)]:
        for kn_id in knowledge_ids:
            rng_level = rng.random()
            if rng_level < 0.15:
                # 15%: non renseigné (données incomplètes)
                continue
            level = rng.randint(1, 5)
            if rng.random() < 0.1:
                level = 0  # jamais, placeholder; sera rejeté par coercion -> None
            comp_rows.append(
                {
                    "teacher_id": tid,
                    "knowledge_id": kn_id,
                    "current_level": level if level > 0 else "",
                    "last_assessment_date": (today - timedelta(days=rng.randint(5, 800))).isoformat(),
                    "validated": "true" if level >= 4 else "false",
                    "source": "ASSESSMENT",
                }
            )
    pd.DataFrame(comp_rows).to_csv(raw_dir / "teacher_competencies.csv", index=False)

    # ------------------------------------------------------ inscriptions & suivis
    enroll_rows, att_rows, eval_rows, cert_rows, outcome_rows = [], [], [], [], []
    training_ids = [c[0] for c in catalog]
    outcome_id = 1
    for tid in [f"ENS{i:03d}" for i in range(1, 31)]:
        n_enroll = rng.randint(0, 5)
        for _ in range(n_enroll):
            trid = rng.choice(training_ids)
            enrolled_at = today - timedelta(days=rng.randint(30, 500))
            completed = rng.random() < 0.6
            completion = enrolled_at + timedelta(days=25) if completed else None
            status = "COMPLETED" if completed else ("DROPPED" if rng.random() < 0.3 else "ENROLLED")
            enroll_rows.append(
                {
                    "enrollment_id": f"ENR-{tid}-{trid}",
                    "teacher_id": tid,
                    "training_id": trid,
                    "status": status,
                    "enrolled_at": enrolled_at.isoformat(),
                    "completion_date": completion.isoformat() if completion else "",
                    "certificate_issued": str(completed).lower(),
                }
            )
            if rng.random() < 0.7:
                att_rows.append(
                    {
                        "attendance_id": f"ATT-{tid}-{trid}",
                        "teacher_id": tid,
                        "training_id": trid,
                        "session_date": (enrolled_at + timedelta(days=3)).isoformat(),
                        "present": str(rng.random() < 0.9).lower(),
                    }
                )
            if completed:
                note = rng.randint(10, 20)
                eval_rows.append(
                    {
                        "evaluation_id": f"EV-{tid}-{trid}",
                        "teacher_id": tid,
                        "training_id": trid,
                        "note": note,
                        "satisfaisant": str(note >= 14).lower(),
                        "evaluation_date": (enrolled_at + timedelta(days=30)).isoformat(),
                    }
                )
                cert_rows.append(
                    {
                        "certificate_id": f"CERT-{tid}-{trid}",
                        "teacher_id": tid,
                        "training_id": trid,
                        "issued_date": (enrolled_at + timedelta(days=32)).isoformat(),
                        "valid": "true",
                    }
                )
                outcome_rows.append(
                    {
                        "outcome_id": f"OUT-{outcome_id:04d}",
                        "teacher_id": tid,
                        "training_id": trid,
                        "completed": "true",
                        "effectiveness_score": round(min(1.0, (note - 10) / 10), 2),
                        "stagnation_risk": str(rng.random() < 0.3).lower(),
                        "future_need": str(rng.random() < 0.4).lower(),
                        "outcome_date": (enrolled_at + timedelta(days=40)).isoformat(),
                    }
                )
                outcome_id += 1
    pd.DataFrame(enroll_rows).to_csv(raw_dir / "enrollments.csv", index=False)
    pd.DataFrame(att_rows).to_csv(raw_dir / "attendance.csv", index=False)
    pd.DataFrame(eval_rows).to_csv(raw_dir / "evaluations.csv", index=False)
    pd.DataFrame(cert_rows).to_csv(raw_dir / "certificates.csv", index=False)
    pd.DataFrame(outcome_rows).to_csv(raw_dir / "training_outcomes.csv", index=False)

    # ------------------------------------------------------------ besoins
    need_rows = []
    for tid in [f"ENS{i:03d}" for i in range(1, 31)]:
        if rng.random() < 0.4:
            kn = rng.choice(knowledge_ids)
            need_rows.append(
                {
                    "need_id": f"NEED-{tid}-{kn}",
                    "teacher_id": tid,
                    "knowledge_id": kn,
                    "status": rng.choice(["APPROVED", "PENDING", "PENDING", "FULFILLED"]),
                    "requested_at": (today - timedelta(days=rng.randint(5, 120))).isoformat(),
                    "priority": rng.randint(1, 5),
                    "theme": "Développement professionnel",
                }
            )
    pd.DataFrame(need_rows).to_csv(raw_dir / "training_needs.csv", index=False)

    # -------------------------------------------------------- snapshots
    snap_rows = []
    for tid in [f"ENS{i:03d}" for i in range(1, 31)]:
        for m in range(1, 7):
            snap_rows.append(
                {
                    "snapshot_id": f"SNAP-{tid}-{m}",
                    "teacher_id": tid,
                    "snapshot_date": (today - timedelta(days=30 * m)).isoformat(),
                    "avg_current_level": round(rng.uniform(1, 4), 2),
                    "avg_required_level": round(rng.uniform(3, 4.5), 2),
                    "nb_gaps_open": rng.randint(0, 8),
                    "weighted_gap_severity": round(rng.uniform(0, 1), 2),
                    "has_data": "true",
                }
            )
    pd.DataFrame(snap_rows).to_csv(raw_dir / "teacher_profile_snapshots.csv", index=False)

    # legacy aliases (démo)
    pd.DataFrame(
        [
            {"legacy_id": f"T{i:03d}", "canonical_id": f"ENS{i:03d}"}
            for i in range(1, 31)
        ]
    ).to_csv(raw_dir / "id_aliases.csv", index=False)

    print(f"Jeu de données généré dans {raw_dir}")


if __name__ == "__main__":
    import sys

    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/raw")
    generate(target)
