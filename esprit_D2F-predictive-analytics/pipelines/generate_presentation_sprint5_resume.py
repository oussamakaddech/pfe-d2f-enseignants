"""Génère la présentation RÉSUMÉ du Sprint 5 (analyse prédictive) — version courte pour soutenance.

Usage : python pipelines/generate_presentation_sprint5_resume.py
Sortie : rapport-pfe/presentation_sprint5_resume.pptx (8 diapositives 16:9)
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pathlib import Path

BLEU = RGBColor(0x1F, 0x4E, 0x79)
BLEU2 = RGBColor(0x2E, 0x74, 0xB5)
GRIS = RGBColor(0x44, 0x44, 0x44)
VERT = RGBColor(0x2E, 0x7D, 0x32)
ROUGE = RGBColor(0xC0, 0x39, 0x2B)
BLANC = RGBColor(0xFF, 0xFF, 0xFF)

OUT = Path(r"C:\Users\oussama\Desktop\pfe-d2f-enseignants\rapport-pfe\presentation_sprint5_resume.pptx")
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def add_slide(title, bullets, title_color=BLEU):
    s = prs.slides.add_slide(BLANK)
    bar = s.shapes.add_shape(1, Inches(0), Inches(0), prs.slide_width, Inches(1.0))
    bar.fill.solid(); bar.fill.fore_color.rgb = title_color; bar.line.fill.background()
    tf = bar.text_frame; tf.text = title
    p = tf.paragraphs[0]; p.font.size = Pt(28); p.font.bold = True; p.font.color.rgb = BLANC
    body = s.shapes.add_textbox(Inches(0.6), Inches(1.25), Inches(12.1), Inches(5.9))
    btf = body.text_frame; btf.word_wrap = True
    for i, (txt, lvl, bold, color) in enumerate(bullets):
        para = btf.paragraphs[0] if i == 0 else btf.add_paragraph()
        para.text = ("- " if lvl == 0 else "  · ") + txt
        para.font.size = Pt(22 if lvl == 0 else 18)
        para.font.bold = bold
        para.font.color.rgb = color or GRIS
        para.space_after = Pt(12)
    return s


def add_table_slide(title, headers, rows, note=None):
    s = prs.slides.add_slide(BLANK)
    bar = s.shapes.add_shape(1, Inches(0), Inches(0), prs.slide_width, Inches(1.0))
    bar.fill.solid(); bar.fill.fore_color.rgb = BLEU; bar.line.fill.background()
    tf = bar.text_frame; tf.text = title
    p = tf.paragraphs[0]; p.font.size = Pt(26); p.font.bold = True; p.font.color.rgb = BLANC
    nrows, ncols = len(rows) + 1, len(headers)
    tbl = s.shapes.add_table(nrows, ncols, Inches(0.5), Inches(1.3),
                             Inches(12.3), Inches(0.55 * nrows)).table
    for j, h in enumerate(headers):
        cell = tbl.cell(0, j); cell.text = h
        pr = cell.text_frame.paragraphs[0]
        pr.font.bold = True; pr.font.size = Pt(16); pr.font.color.rgb = BLEU
        cell.fill.solid(); cell.fill.fore_color.rgb = RGBColor(0xD9, 0xE2, 0xF3)
    for i, row in enumerate(rows, start=1):
        for j, val in enumerate(row):
            cell = tbl.cell(i, j); cell.text = str(val)
            pr = cell.text_frame.paragraphs[0]
            pr.font.size = Pt(14)
            if isinstance(val, str) and ("ACTIVE" in val or "VAINQUEUR" in val):
                pr.font.color.rgb = VERT; pr.font.bold = True
            elif isinstance(val, str) and ("Refus" in val or "REFUS" in val or "Pire" in val):
                pr.font.color.rgb = ROUGE; pr.font.bold = True
    if note:
        nb = s.shapes.add_textbox(Inches(0.5), Inches(6.5), Inches(12.3), Inches(0.8))
        ntf = nb.text_frame; ntf.word_wrap = True
        ntf.text = note
        np_ = ntf.paragraphs[0]; np_.font.size = Pt(13); np_.font.italic = True; np_.font.color.rgb = GRIS
    return s
# 1. Titre
s = prs.slides.add_slide(BLANK)
bg = s.shapes.add_shape(1, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
bg.fill.solid(); bg.fill.fore_color.rgb = BLEU; bg.line.fill.background()
tb = s.shapes.add_textbox(Inches(0.8), Inches(2.4), Inches(11.7), Inches(2.8))
ttf = tb.text_frame; ttf.word_wrap = True
ttf.text = "Sprint 5 — Résumé"
ttf.paragraphs[0].font.size = Pt(40); ttf.paragraphs[0].font.color.rgb = RGBColor(0xBF, 0xD7, 0xEE)
p2 = ttf.add_paragraph(); p2.text = "Analyse prédictive et recommandation de formations"
p2.font.size = Pt(32); p2.font.bold = True; p2.font.color.rgb = BLANC
p3 = ttf.add_paragraph(); p3.text = "ML actif en production · gouvernance fail-closed · métriques honnêtes"
p3.font.size = Pt(18); p3.font.color.rgb = RGBColor(0xD9, 0xE2, 0xF3)

# 2. Objectifs et livrables
add_slide("Objectifs et livrables", [
    ("Prédire l'écart de compétence à M+3 (cible gap_next_3m observée) et scorer le risque (0.50/0.12/0.40)", 0, False, None),
    ("Recommander des formations (contenu 0.70 / qualité 0.20 / récence 0.10) par périmètre autorisé", 0, False, None),
    ("Livrable : service FastAPI (gaps, risk, recommendations, dashboards, ml-observability)", 0, True, VERT),
    ("Modèle actif v1.1.0 servi en PRODUCTION_ML — moteur heuristique explicite en repli", 1, False, None),
])

# 3. Modèle actif
add_slide("Modèle actif v1.1.0 — Perceptron multicouche", [
    ("MLPRegressor 32→16 neurones, régularisation α=0.01, seed 42 — retenu en CV 5-fold face au GB", 0, False, None),
    ("Entraîné sur 217 observations RÉELLES (train 174 / test 43, split temporel strict)", 0, True, None),
    ("RMSE 1.2319 / MAE 1.1556 / R² 0.2234 — lift ×1.26 vs baseline, IC95 SIGNIFICATIF", 0, True, VERT),
    ("32/44 enseignants servis en ML ; 12 en repli heuristique explicite (aucune donnée sur leur périmètre)", 1, False, None),
])

# 4. Résultats chiffrés
add_table_slide(
    "Résultats clés (holdout temporel réel)",
    ["Modèle", "RMSE", "MAE", "R²", "Décision"],
    [
        ["Baseline persistance", "2.4949", "2.0911", "-", "Référence"],
        ["MLP 32-16 (v1.1.0)", "1.2319", "1.1556", "0.223", "ACTIVE — servi"],
        ["XGBoost (v1.2.0)", "1.1882", "1.1185", "0.278", "Refusé (IC95 inclut 0)"],
        ["Risk ML (régression logistique)", "macro-F1 0.525", "-", "-", "REFUSÉ fail-closed"],
    ],
    note="Le meilleur RMSE brut ne suffit pas : la promotion exige une preuve statistique sur données réelles. Le risque ML reste heuristique (Brier 0.021 OK, macro-F1 0.525 < 0.70).")

# 5. Gouvernance fail-closed
add_slide("Gouvernance : chaque réponse est traçable", [
    ("SHA-256 de l'artefact vérifié à chaque chargement (registre + sidecar)", 0, False, None),
    ("Fail-closed vérifié en exécution : le risque ML rejeté est INCHARGEABLE (decision=reject)", 0, True, VERT),
    ("Chaque réponse expose : model_mode, model_version, fallback_reason — observabilité dédiée", 1, False, None),
    ("Deux corpus jamais mélangés : KS p<0.0001, échelles et signal différents — transfert simulé→réel MESURÉ négatif (1.23→2.01)", 0, True, ROUGE),
])

# 6. Effet du volume
add_table_slide(
    "Expérience à 1 500 lignes : le volume change le champion",
    ["Modèle", "RMSE", "R²", "Verdict"],
    [
        ["Gradient Boosting", "0.6376", "0.534", "VAINQUEUR (IC95)"],
        ["Ridge", "0.6515", "0.514", "Proche second"],
        ["MLP 32-16", "0.6742", "0.479", "Dépassé dès ~900 lignes"],
    ],
    note="Corpus de test SIMULÉ : valide la mécanique (split, gouvernance, protocole multi-fenêtres ouvert : 5 fenêtres, RMSE moyen 0.6724) — pas une performance métier. Le GB (RMSE 0.6376) est le MODÈLE RETENU pour la phase de montée en charge : challenger désigné, enregistré CANDIDATE, promu sur preuve réelle à ~900 lignes.")

# 6b. Accuracy des modeles (incl. GB 1500 lignes)
add_table_slide(
    "Accuracy des modèles (part de prédictions à ±0,5 / ±1 point)",
    ["Modèle", "Corpus (n test)", "Acc. ±0,5", "Acc. ±1,0"],
    [
        ["Baseline persistance", "Réel (43)", "20,9 %", "39,5 %"],
        ["MLP 32-16 (v1.1.0) — ACTIVE", "Réel (43)", "7,0 %", "37,2 %"],
        ["Gradient Boosting (overlay)", "Simulé (2 184)", "73,4 %", "92,5 %"],
        ["Gradient Boosting", "Test 1500 (300)", "62,3 %", "90,3 %"],
        ["Ridge", "Test 1500 (300)", "62,7 %", "88,3 %"],
        ["MLP", "Test 1500 (300)", "60,3 %", "86,0 %"],
        ["Risk ML (régression logistique)", "Simulé (270)", "exacte : 3,0 %", "REFUSÉ"],
    ],
    note="Paradoxe assumé : la persistance a la meilleure accuracy stricte (la majorité des gaps sont inchangés) mais son RMSE est 2× pire — le critère de promotion reste le lift, pas l'accuracy stricte. Accuracy simulée ≠ performance métier.")

# 7. Qualité logicielle
add_slide("Qualité logicielle", [
    ("570+ tests Python (exit 0) — gouvernance, modes ML, cache, serving couverts", 0, True, VERT),
    ("Couverture du module : ~89 % (analyse : 1271/1432 lignes = 88.8 %)", 1, False, None),
    ("Dataset validé : 0 manquant, 0 doublon, 0 fuite (gap_next_3m exclu de X)", 1, False, None),
    ("Nettoyage testé (3 variantes) : aucun gain significatif — le facteur limitant est le VOLUME, pas la qualité", 1, False, None),
])

# 7b. Usage assume de la data generee (mode demo = modele gagnant servi)
add_slide("La data générée est DÉJÀ utilisée — avec son modèle gagnant", [
    ("Overlay de démonstration : le GB simulation-v1.0.0 est SERVI (meilleur modèle du corpus simulé : RMSE 0.5115 vs MLP 0.5314 / XGBoost 0.5247)", 0, True, VERT),
    ("La démo applicative affiche le chemin ML complet : modèle chargé, 29 features, prédictions réelles de réseau — étiquetées « données simulées »", 1, False, None),
    ("La ligne de partage est le CONTEXTE DE SERVICE, pas l'existence des données : démo = gagnant du corpus généré servi ; production = 217 lignes réelles uniquement", 0, True, None),
    ("Garantie : aucun chiffre présenté comme réel ne provient de données synthétiques (KS p<0.0001, ML_REQUIRE_REAL_DATA, SIMULATION_VALIDATED jamais REAL_VALIDATED)", 1, False, ROUGE),
    ("Avantage soutenance : montrer le système COMPLET en démo, tout en défendant chaque chiffre réel devant le jury", 1, True, BLEU2),
])

# 8. Conclusion
# 8. Conclusion
add_slide("Conclusion & perspectives", [
    ("ML actif en production sur données réelles, gouvernance fail-closed de bout en bout", 0, True, VERT),
    ("217 lignes = TOUTE la donnée existante ; snapshot mensuel automatisé → le corpus croît seul", 1, False, None),
    ("Validation multi-fenêtres armée : déclenchement automatique à 500 lignes / 6 mois", 1, False, None),
    ("Challengers refusés sur preuve (XGBoost, risk ML) et challenger de demain identifié (GB, volume ~900+)", 1, False, None),
    ("MODÈLE RETENU pour la montée en charge : Gradient Boosting (RMSE 0.6376 à 1 500 lignes, IC95) — enregistré CANDIDATE, promotion sur preuve réelle", 0, True, VERT),
    ("« Le volume est la perspective — la méthodologie est complète dès aujourd'hui »", 0, True, BLEU2),
])

prs.save(OUT)
print("OK:", OUT, "| slides:", len(prs.slides._sldIdLst))

