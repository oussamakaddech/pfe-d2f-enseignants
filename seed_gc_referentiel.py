"""
seed_gc_referentiel.py
══════════════════════
Seed complet du référentiel Génie Civil (GC) ESPRIT pour la plateforme D2F.
Insère dans PostgreSQL :
  • 1 UP  +  1 Département  Génie Civil
  • 9 Enseignants GC  (MZ, SM, NA, MS, MA, AB, TK, IEG, AA)
  • 5 Domaines         (GC-TECH, GC-RDI, GC-PERS, GC-COM, GC-PED)
  • 6 Compétences       sous GC-TECH  (Sols, Construction, Physique, Eau, Urbanisme, Transversales)
  • 28 Sous-compétences  (C1–C8, S1–S6, P1–P3, E1–E3, U1–U3, T1–T5)
  • 46 Savoirs           (C1a … T5)
  • Enseignant-compétence : affectations réelles (46 liens)
"""

import psycopg2

DB = dict(dbname="d2f", user="d2f", password="d2fpasswd", host="localhost", port="7432")
conn = psycopg2.connect(**DB)
cur = conn.cursor()

# ═══════════════════════════════════════════════════════════════════════════════
# 1.  UP & Département Génie Civil
# ═══════════════════════════════════════════════════════════════════════════════

cur.execute("INSERT INTO ups (id, libelle) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING",
            ("4", "Génie Civil"))
cur.execute("INSERT INTO departements (id, libelle) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING",
            ("4", "Département Génie Civil"))

# ═══════════════════════════════════════════════════════════════════════════════
# 2.  Enseignants GC
# ═══════════════════════════════════════════════════════════════════════════════

enseignants_gc = [
    # (id,    nom,          prenom,   mail,                              type, etat, cup, chef, up, dept)
    ("GC01", "Zouari",     "Mohsen",  "mohsen.zouari@esprit.tn",        "P", "A", "O", "N", "4", "4"),   # MZ
    ("GC02", "Mansouri",   "Sami",    "sami.mansouri@esprit.tn",        "P", "A", "O", "O", "4", "4"),   # SM
    ("GC03", "Ayari",      "Nadia",   "nadia.ayari@esprit.tn",          "P", "A", "O", "N", "4", "4"),   # NA
    ("GC04", "Slimane",    "Mohamed", "mohamed.slimane@esprit.tn",      "P", "A", "O", "N", "4", "4"),   # MS
    ("GC05", "Abidi",      "Mounir",  "mounir.abidi@esprit.tn",        "P", "A", "N", "N", "4", "4"),   # MA
    ("GC06", "Bouzid",     "Anis",    "anis.bouzid@esprit.tn",         "V", "A", "N", "N", "4", "4"),   # AB
    ("GC07", "Kammoun",    "Tarek",   "tarek.kammoun@esprit.tn",       "P", "A", "N", "N", "4", "4"),   # TK
    ("GC08", "El Gharbi",  "Imed",    "imed.elgharbi@esprit.tn",       "V", "A", "N", "N", "4", "4"),   # IEG
    ("GC09", "Amri",       "Amel",    "amel.amri@esprit.tn",           "P", "A", "N", "N", "4", "4"),   # AA
]

for eid, nom, prenom, mail, typ, etat, cup, chef, up_id, dept_id in enseignants_gc:
    cur.execute("""
        INSERT INTO enseignants (id, nom, prenom, mail, type, etat, cup, chefdepartement, up_id, dept_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (id) DO NOTHING
    """, (eid, nom, prenom, mail, typ, etat, cup, chef, up_id, dept_id))

# ═══════════════════════════════════════════════════════════════════════════════
# 3.  Domaines
# ═══════════════════════════════════════════════════════════════════════════════

domaines = [
    ("GC-TECH", "Technique / Métier Génie Civil",  "Compétences techniques et métier de l'ingénieur GC"),
    ("GC-RDI",  "Recherche et Innovation",          "Capacité de recherche et d'innovation en GC"),
    ("GC-PERS", "Personnel et Relationnel",          "Compétences personnelles et relationnelles"),
    ("GC-COM",  "Communication et Culture",          "Communication professionnelle et culture générale"),
    ("GC-PED",  "Pédagogie",                         "Compétences pédagogiques de l'enseignant GC"),
]

for code, nom, desc in domaines:
    cur.execute("""
        INSERT INTO domaines (code, nom, description, actif)
        VALUES (%s, %s, %s, true)
        ON CONFLICT (code) DO NOTHING
    """, (code, nom, desc))

# ═══════════════════════════════════════════════════════════════════════════════
# 4.  Compétences  (sous GC-TECH)
# ═══════════════════════════════════════════════════════════════════════════════

competences = [
    # (code,         nom,                                 description,                                                      ordre)
    ("GC-TECH-S", "Compétences sols",                    "Géologie, géotechnique, fondations et risques du sol",              1),
    ("GC-TECH-C", "Compétences construction",            "Structures béton armé, ouvrages d'art, routes et gestion projet",   2),
    ("GC-TECH-P", "Physique du bâtiment",                "Thermique, acoustique et équipements techniques",                   3),
    ("GC-TECH-E", "Compétences eau",                     "Hydraulique, hydrologie et diagnostic environnemental",             4),
    ("GC-TECH-U", "Compétences urbanisme",               "Analyse et aménagement urbain",                                    5),
    ("GC-TECH-T", "Compétences transversales GC",        "BIM, normes, sécurité, communication et management GC",             6),
]

for code, nom, desc, ordre in competences:
    cur.execute("""
        INSERT INTO competences (code, nom, description, ordre, domaine_id)
        VALUES (%s, %s, %s, %s, (SELECT id FROM domaines WHERE code = 'GC-TECH'))
        ON CONFLICT (code) DO NOTHING
    """, (code, nom, desc, ordre))

# ═══════════════════════════════════════════════════════════════════════════════
# 5.  Sous-compétences
# ═══════════════════════════════════════════════════════════════════════════════

sous_competences = [
    # ── Sols (GC-TECH-S) ─────────────────────────────────────────────────────
    ("S1", "Coupe géologique",               "Lire, effectuer et interpréter une coupe géologique",       "GC-TECH-S"),
    ("S2", "Essais géotechniques",           "Réaliser et interpréter les essais géotechniques",          "GC-TECH-S"),
    ("S3", "Risque rupture de pente",        "Évaluer le risque de rupture de pente",                    "GC-TECH-S"),
    ("S4", "Instabilité hydraulique",        "Analyser l'instabilité hydraulique des sols",              "GC-TECH-S"),
    ("S5", "Risque sismique",                "Évaluer le risque sismique sur les structures",            "GC-TECH-S"),
    ("S6", "Fondations et soutènements",     "Concevoir et dimensionner fondations et soutènements",     "GC-TECH-S"),

    # ── Construction (GC-TECH-C) ─────────────────────────────────────────────
    ("C1", "Structure bâtiment béton armé",  "Concevoir et dimensionner des structures en béton armé",   "GC-TECH-C"),
    ("C2", "Ouvrage d'art",                  "Concevoir et dimensionner des ouvrages d'art",             "GC-TECH-C"),
    ("C3", "Infrastructure routière",        "Concevoir et superviser les infrastructures routières",    "GC-TECH-C"),
    ("C4", "Gestion projet infrastructure",  "Gérer un projet d'infrastructure de A à Z",               "GC-TECH-C"),
    ("C5", "Étude d'impacts",               "Réaliser une étude d'impacts environnementaux",            "GC-TECH-C"),
    ("C6", "Modes constructifs",             "Maîtriser les différents modes constructifs",              "GC-TECH-C"),
    ("C7", "État de santé structurel",       "Évaluer l'état de santé structurel d'un ouvrage",         "GC-TECH-C"),
    ("C8", "Réhabilitation ouvrage d'art",   "Planifier et piloter la réhabilitation d'ouvrages",       "GC-TECH-C"),

    # ── Physique du bâtiment (GC-TECH-P) ─────────────────────────────────────
    ("P1", "Physique du bâtiment",           "Analyser et modéliser la physique du bâtiment",           "GC-TECH-P"),
    ("P2", "Santé thermique et acoustique",  "Diagnostiquer la santé thermique et acoustique",          "GC-TECH-P"),
    ("P3", "Équipements techniques",         "Dimensionner les équipements techniques du bâtiment",     "GC-TECH-P"),

    # ── Eau (GC-TECH-E) ──────────────────────────────────────────────────────
    ("E1", "Hydraulique et hydrologie",      "Maîtriser l'hydraulique et la modélisation hydrologique", "GC-TECH-E"),
    ("E2", "Diagnostic hydrologie",          "Réaliser un diagnostic hydrologique complet",             "GC-TECH-E"),
    ("E3", "Diagnostic environnemental",     "Réaliser un diagnostic environnemental",                  "GC-TECH-E"),

    # ── Urbanisme (GC-TECH-U) ────────────────────────────────────────────────
    ("U1", "Analyse urbaine",                "Réaliser une analyse urbaine du territoire",              "GC-TECH-U"),
    ("U2", "Diagnostic urbain",              "Élaborer un diagnostic urbain",                           "GC-TECH-U"),
    ("U3", "Projet d'aménagement urbain",    "Concevoir et piloter un projet d'aménagement urbain",    "GC-TECH-U"),

    # ── Transversales GC (GC-TECH-T) ────────────────────────────────────────
    ("T1", "Outils numériques BIM",          "Maîtriser les outils numériques et le BIM",              "GC-TECH-T"),
    ("T2", "Normes et réglementations",      "Appliquer les normes et réglementations du GC",          "GC-TECH-T"),
    ("T3", "Qualité et sécurité chantier",   "Gérer la qualité et la sécurité sur chantier",           "GC-TECH-T"),
    ("T4", "Communication professionnelle",  "Communiquer en contexte professionnel GC",               "GC-TECH-T"),
    ("T5", "Management pluridisciplinaire",  "Manager une équipe pluridisciplinaire de chantier",       "GC-TECH-T"),
]

for code, nom, desc, comp_code in sous_competences:
    cur.execute("""
        INSERT INTO sous_competences (code, nom, description, competence_id)
        VALUES (%s, %s, %s, (SELECT id FROM competences WHERE code = %s))
        ON CONFLICT (code) DO NOTHING
    """, (code, nom, desc, comp_code))

# ═══════════════════════════════════════════════════════════════════════════════
# 6.  Savoirs  (code, nom, description, type, sous_competence_code)
# ═══════════════════════════════════════════════════════════════════════════════

savoirs = [
    # ── S1 : Coupe géologique ────────────────────────────────────────────────
    ("S1a", "Effectuer une coupe géologique",               "Réaliser une coupe géologique à partir de données terrain",         "PRATIQUE",   "S1"),
    ("S1b", "Interpréter données géologiques",              "Lire et interpréter les données géologiques de terrain",            "THEORIQUE",  "S1"),
    ("S1c", "Modéliser couches géologiques",                "Modéliser les couches géologiques à l'aide d'outils numériques",    "PRATIQUE",   "S1"),
    ("S1d", "Rédiger rapport géologique",                   "Rédiger un rapport géologique complet et structuré",                "PRATIQUE",   "S1"),

    # ── S2 : Essais géotechniques ────────────────────────────────────────────
    ("S2a", "Réaliser essais géotechniques en laboratoire", "Effectuer les essais géotechniques normalisés en laboratoire",      "PRATIQUE",   "S2"),
    ("S2b", "Interpréter résultats géotechniques",          "Analyser et interpréter les résultats d'essais géotechniques",      "THEORIQUE",  "S2"),

    # ── S3–S5 : Risques ──────────────────────────────────────────────────────
    ("S3",  "Évaluer risque rupture de pente",              "Analyser la stabilité des pentes et évaluer les risques",           "PRATIQUE",   "S3"),
    ("S4",  "Analyser instabilité hydraulique",             "Évaluer les risques d'instabilité hydraulique des sols",            "PRATIQUE",   "S4"),
    ("S5",  "Évaluer risque sismique",                      "Évaluer le risque sismique et ses impacts sur les structures",      "PRATIQUE",   "S5"),

    # ── S6 : Fondations & soutènements ───────────────────────────────────────
    ("S6a", "Concevoir fondations",                         "Concevoir des fondations adaptées au contexte géotechnique",        "PRATIQUE",   "S6"),
    ("S6b", "Dimensionner soutènements",                    "Calculer et dimensionner les ouvrages de soutènement",             "THEORIQUE",  "S6"),
    ("S6c", "Vérifier stabilité fondations",                "Vérifier la stabilité et la conformité des fondations",             "PRATIQUE",   "S6"),

    # ── C1 : Structure bâtiment béton armé ───────────────────────────────────
    ("C1a", "Concevoir structure bâtiment béton armé",      "Concevoir la structure porteuse d'un bâtiment en béton armé",       "PRATIQUE",   "C1"),
    ("C1b", "Dimensionner structure béton armé",            "Calculer et dimensionner les éléments structuraux en BA",           "THEORIQUE",  "C1"),
    ("C1c", "Vérifier conformité structurelle béton armé",  "Vérifier la conformité aux normes des structures BA",              "PRATIQUE",   "C1"),

    # ── C2 : Ouvrage d'art ───────────────────────────────────────────────────
    ("C2a", "Concevoir ouvrage d'art",                      "Concevoir les différents types d'ouvrages d'art",                  "PRATIQUE",   "C2"),
    ("C2b", "Dimensionner ouvrage d'art",                   "Calculer et dimensionner les ouvrages d'art",                      "THEORIQUE",  "C2"),
    ("C2c", "Contrôler exécution ouvrage d'art",            "Contrôler l'exécution et la qualité des ouvrages d'art",           "PRATIQUE",   "C2"),

    # ── C3 : Infrastructure routière ─────────────────────────────────────────
    ("C3a", "Concevoir infrastructure routière",            "Concevoir le tracé et les ouvrages d'une infrastructure routière", "PRATIQUE",   "C3"),
    ("C3b", "Dimensionner chaussée et terrassement",        "Calculer les dimensionnements de chaussée et terrassement",        "THEORIQUE",  "C3"),
    ("C3c", "Superviser chantier routier",                  "Superviser et piloter un chantier de construction routière",       "PRATIQUE",   "C3"),

    # ── C4–C8 : savoirs unitaires ────────────────────────────────────────────
    ("C4",  "Gérer projet d'infrastructure",                "Planifier, piloter et contrôler un projet d'infrastructure",       "PRATIQUE",   "C4"),
    ("C5",  "Réaliser étude d'impacts",                     "Conduire une étude d'impacts environnementaux complète",           "PRATIQUE",   "C5"),
    ("C6",  "Maîtriser modes constructifs",                 "Connaître et choisir les modes constructifs appropriés",           "THEORIQUE",  "C6"),
    ("C7",  "Évaluer état de santé structurel",             "Diagnostiquer l'état de santé structurel d'un ouvrage existant",   "PRATIQUE",   "C7"),
    ("C8",  "Réhabiliter ouvrage d'art",                    "Planifier et piloter la réhabilitation d'ouvrages d'art",          "PRATIQUE",   "C8"),

    # ── P1 : Physique du bâtiment ────────────────────────────────────────────
    ("P1a", "Analyser physique du bâtiment",                "Analyser les phénomènes physiques affectant le bâtiment",          "THEORIQUE",  "P1"),
    ("P1b", "Modéliser comportement thermique",             "Modéliser le comportement thermique d'un bâtiment",               "PRATIQUE",   "P1"),
    ("P1c", "Optimiser performance énergétique",            "Optimiser la performance énergétique des bâtiments",              "PRATIQUE",   "P1"),

    # ── P2–P3 ────────────────────────────────────────────────────────────────
    ("P2",  "Diagnostiquer santé thermique et acoustique",  "Diagnostiquer la santé thermique et acoustique du bâtiment",       "PRATIQUE",   "P2"),
    ("P3",  "Dimensionner équipements techniques",          "Dimensionner les équipements techniques d'un bâtiment",           "PRATIQUE",   "P3"),

    # ── E1 : Hydraulique & hydrologie ────────────────────────────────────────
    ("E1a", "Maîtriser hydraulique",                        "Maîtriser les lois et principes de l'hydraulique",                 "THEORIQUE",  "E1"),
    ("E1b", "Modéliser hydrologie",                         "Modéliser les phénomènes hydrologiques d'un bassin versant",      "PRATIQUE",   "E1"),

    # ── E2–E3 ────────────────────────────────────────────────────────────────
    ("E2",  "Réaliser diagnostic hydrologique",             "Réaliser un diagnostic hydrologique complet",                      "PRATIQUE",   "E2"),
    ("E3",  "Réaliser diagnostic environnemental",          "Conduire un diagnostic environnemental global",                    "PRATIQUE",   "E3"),

    # ── U1–U3 ────────────────────────────────────────────────────────────────
    ("U1",  "Réaliser analyse urbaine",                     "Analyser le tissu urbain d'un territoire",                         "THEORIQUE",  "U1"),
    ("U2",  "Élaborer diagnostic urbain",                   "Élaborer un diagnostic urbain complet",                            "PRATIQUE",   "U2"),
    ("U3a", "Concevoir projet d'aménagement urbain",        "Concevoir un projet d'aménagement urbain durable",                "PRATIQUE",   "U3"),
    ("U3b", "Piloter projet d'aménagement urbain",          "Piloter la mise en œuvre d'un projet d'aménagement urbain",        "PRATIQUE",   "U3"),

    # ── T1–T5 : Transversales GC ────────────────────────────────────────────
    ("T1",  "Maîtriser outils numériques BIM",              "Utiliser les outils numériques et la méthodologie BIM",            "PRATIQUE",   "T1"),
    ("T2",  "Appliquer normes et réglementations",          "Appliquer les normes et réglementations en vigueur en GC",         "THEORIQUE",  "T2"),
    ("T3",  "Gérer qualité et sécurité chantier",           "Mettre en place les démarches qualité et sécurité chantier",       "PRATIQUE",   "T3"),
    ("T4",  "Communiquer en contexte professionnel GC",     "Communiquer efficacement dans le milieu du génie civil",           "PRATIQUE",   "T4"),
    ("T5",  "Manager équipe pluridisciplinaire",            "Coordonner et manager une équipe pluridisciplinaire",              "PRATIQUE",   "T5"),
]

for code, nom, desc, typ, sc_code in savoirs:
    cur.execute("""
        INSERT INTO savoirs (code, nom, description, type, sous_competence_id)
        VALUES (%s, %s, %s, %s, (SELECT id FROM sous_competences WHERE code = %s))
        ON CONFLICT (code) DO NOTHING
    """, (code, nom, desc, typ, sc_code))

# ═══════════════════════════════════════════════════════════════════════════════
# 7.  Affectation enseignant ↔ savoir  (enseignant_competences)
#     Table : enseignant_id (String), savoir_id (FK→savoirs), niveau, date_acquisition
# ═══════════════════════════════════════════════════════════════════════════════

#  Niveaux assignés selon le rang du savoir dans la compétence :
#    N1_DEBUTANT, N2_ELEMENTAIRE, N3_INTERMEDIAIRE, N4_AVANCE, N5_EXPERT

# Niveau mapping helper (from the competence table)
NIVEAUX_MAP = {
    # Sols
    "S1a": "N2_ELEMENTAIRE",   "S1b": "N3_INTERMEDIAIRE", "S1c": "N4_AVANCE",  "S1d": "N4_AVANCE",
    "S2a": "N1_DEBUTANT",      "S2b": "N2_ELEMENTAIRE",
    "S3":  "N5_EXPERT",        "S4":  "N5_EXPERT",        "S5":  "N5_EXPERT",
    "S6a": "N4_AVANCE",        "S6b": "N4_AVANCE",        "S6c": "N5_EXPERT",
    # Construction
    "C1a": "N3_INTERMEDIAIRE", "C1b": "N4_AVANCE",        "C1c": "N5_EXPERT",
    "C2a": "N3_INTERMEDIAIRE", "C2b": "N4_AVANCE",        "C2c": "N5_EXPERT",
    "C3a": "N3_INTERMEDIAIRE", "C3b": "N4_AVANCE",        "C3c": "N5_EXPERT",
    "C4":  "N4_AVANCE",
    "C5":  "N5_EXPERT",        "C6":  "N5_EXPERT",
    "C7":  "N5_EXPERT",        "C8":  "N5_EXPERT",
    # Physique
    "P1a": "N3_INTERMEDIAIRE", "P1b": "N4_AVANCE",        "P1c": "N5_EXPERT",
    "P2":  "N3_INTERMEDIAIRE", "P3":  "N4_AVANCE",
    # Eau
    "E1a": "N4_AVANCE",        "E1b": "N5_EXPERT",
    "E2":  "N5_EXPERT",        "E3":  "N5_EXPERT",
    # Urbanisme
    "U1":  "N3_INTERMEDIAIRE", "U2":  "N3_INTERMEDIAIRE",
    "U3a": "N5_EXPERT",        "U3b": "N5_EXPERT",
    # Transversales
    "T1":  "N4_AVANCE",        "T2":  "N4_AVANCE",
    "T3":  "N4_AVANCE",        "T4":  "N5_EXPERT",        "T5":  "N5_EXPERT",
}

# Affectations réelles (initiales → enseignant ID)
AFFECTATIONS = {
    "GC01": ["S2a", "S2b", "S6a", "S6b", "S4", "C2b", "C3b", "C8", "C7", "C3a", "C3c", "C2a"],   # MZ  (12)
    "GC02": ["C1b", "C5", "C6", "C7", "C1c", "C1a", "P1a", "P2", "U2", "U1", "U3a"],              # SM  (11)
    "GC03": ["C5", "P1a", "P2", "U2", "U1", "U3a"],                                                # NA  (6)
    "GC04": ["C1b", "C2b", "C6", "C1a", "C2c", "C2a"],                                             # MS  (6)
    "GC05": ["S1c", "E1a", "E1b", "E2"],                                                            # MA  (4)
    "GC06": ["C1b", "C6", "C1a"],                                                                   # AB  (3)
    "GC07": ["S1a", "S1b", "C4"],                                                                   # TK  (3)
    "GC08": ["C1a"],                                                                                 # IEG (1)
    # GC09 (AA) : aucune affectation
}

for ens_id, savoir_codes in AFFECTATIONS.items():
    for sav_code in savoir_codes:
        niveau = NIVEAUX_MAP.get(sav_code, "N3_INTERMEDIAIRE")
        cur.execute("""
            INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition)
            VALUES (%s,
                    (SELECT id FROM savoirs WHERE code = %s),
                    %s,
                    CURRENT_DATE)
            ON CONFLICT DO NOTHING
        """, (ens_id, sav_code, niveau))

conn.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# 8.  Vérification
# ═══════════════════════════════════════════════════════════════════════════════

print("═" * 70)
print("  SEED GC REFERENTIEL — RÉSULTAT")
print("═" * 70)

cur.execute("SELECT COUNT(*) FROM domaines WHERE code LIKE 'GC-%'")
print(f"  Domaines GC          : {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM competences WHERE code LIKE 'GC-TECH-%'")
print(f"  Compétences GC-TECH  : {cur.fetchone()[0]}")

cur.execute("""
    SELECT COUNT(*) FROM sous_competences sc
    JOIN competences c ON c.id = sc.competence_id
    WHERE c.code LIKE 'GC-TECH-%'
""")
print(f"  Sous-compétences     : {cur.fetchone()[0]}")

cur.execute("""
    SELECT COUNT(*) FROM savoirs s
    JOIN sous_competences sc ON sc.id = s.sous_competence_id
    JOIN competences c ON c.id = sc.competence_id
    WHERE c.code LIKE 'GC-TECH-%'
""")
print(f"  Savoirs              : {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM enseignants WHERE id LIKE 'GC%'")
print(f"  Enseignants GC       : {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM enseignant_competences WHERE enseignant_id LIKE 'GC%'")
print(f"  Affectations         : {cur.fetchone()[0]}")

# Détail par enseignant
print("\n  Détail par enseignant :")
cur.execute("""
    SELECT e.id, e.nom, e.prenom, COUNT(ec.id) AS nb
    FROM enseignants e
    LEFT JOIN enseignant_competences ec ON ec.enseignant_id = e.id
    WHERE e.id LIKE 'GC%'
    GROUP BY e.id, e.nom, e.prenom
    ORDER BY e.id
""")
for row in cur.fetchall():
    print(f"    {row[0]} | {row[2]:10s} {row[1]:12s} | {row[3]:2d} savoirs")

# Top compétences
print("\n  Couverture par compétence :")
cur.execute("""
    SELECT c.code, c.nom, COUNT(DISTINCT ec.enseignant_id) AS nb_ens, COUNT(DISTINCT s.id) AS nb_sav
    FROM competences c
    JOIN sous_competences sc ON sc.competence_id = c.id
    JOIN savoirs s ON s.sous_competence_id = sc.id
    LEFT JOIN enseignant_competences ec ON ec.savoir_id = s.id
    WHERE c.code LIKE 'GC-TECH-%'
    GROUP BY c.code, c.nom
    ORDER BY c.code
""")
for row in cur.fetchall():
    print(f"    {row[0]:12s} | {row[1]:35s} | {row[2]} enseignants, {row[3]} savoirs")

print("═" * 70)
conn.close()
print("Done !")
