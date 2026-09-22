"""Génère la présentation de SOUTENANCE du Sprint 5 (analyse prédictive).

Calquée sur le chapitre Sprint 5 du rapport (version concise et explicative) :
13 diapositives 16:9, lecture linéaire, un message par diapositive.

Usage : python pipelines/generate_presentation_sprint5_soutenance.py
Sortie : rapport-pfe/presentation_sprint5_soutenance.pptx
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

OUT = Path(r"C:\Users\oussama\Desktop\pfe-d2f-enseignants\rapport-pfe\presentation_sprint5_soutenance.pptx")
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


def add_table_slide(title, headers, rows, note=None, height=0.55):
    s = prs.slides.add_slide(BLANK)
    bar = s.shapes.add_shape(1, Inches(0), Inches(0), prs.slide_width, Inches(1.0))
    bar.fill.solid(); bar.fill.fore_color.rgb = BLEU; bar.line.fill.background()
    tf = bar.text_frame; tf.text = title
    p = tf.paragraphs[0]; p.font.size = Pt(26); p.font.bold = True; p.font.color.rgb = BLANC
    nrows, ncols = len(rows) + 1, len(headers)
    tbl = s.shapes.add_table(nrows, ncols, Inches(0.5), Inches(1.3),
                             Inches(12.3), Inches(height * nrows)).table
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
            if isinstance(val, str) and ("Gagnant" in val or "retenu" in val or "ACTIVE" in val):
                pr.font.color.rgb = VERT; pr.font.bold = True
            elif isinstance(val, str) and ("Refus" in val or "Rejet" in val):
                pr.font.color.rgb = ROUGE; pr.font.bold = True
    if note:
        nb = s.shapes.add_textbox(Inches(0.5), Inches(6.35), Inches(12.3), Inches(0.95))
        ntf = nb.text_frame; ntf.word_wrap = True
        ntf.text = note
        np_ = ntf.paragraphs[0]; np_.font.size = Pt(13); np_.font.italic = True; np_.font.color.rgb = GRIS
    return s

# 1. Titre
s = prs.slides.add_slide(BLANK)
bg = s.shapes.add_shape(1, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
bg.fill.solid(); bg.fill.fore_color.rgb = BLEU; bg.line.fill.background()
tb = s.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(11.7), Inches(3.2))
ttf = tb.text_frame; ttf.word_wrap = True
ttf.text = "Sprint 5"
ttf.paragraphs[0].font.size = Pt(44); ttf.paragraphs[0].font.color.rgb = RGBColor(0xBF, 0xD7, 0xEE)
p2 = ttf.add_paragraph(); p2.text = "Analyse prédictive et recommandation de formations"
p2.font.size = Pt(30); p2.font.bold = True; p2.font.color.rgb = BLANC
p3 = ttf.add_paragraph(); p3.text = "Soutenance PFE — D2F, plateforme de développement des compétences des enseignants"
p3.font.size = Pt(16); p3.font.color.rgb = RGBColor(0xD9, 0xE2, 0xF3)
p4 = ttf.add_paragraph(); p4.text = "Modèle gagnant : Gradient Boosting — preuve, gouvernance, limites assumées"
p4.font.size = Pt(15); p4.font.italic = True; p4.font.color.rgb = RGBColor(0xBF, 0xD7, 0xEE)

# 2. Plan
add_slide("Plan de la présentation", [
    ("1. Le sprint en bref — ce qui a été livré et ce qui a été retenu", 0, False, None),
    ("2. Objectifs et chaîne de traitement", 0, False, None),
    ("3. API et contrat de service (traçabilité)", 0, False, None),
    ("4. Le modèle gagnant — lequel et pourquoi", 0, False, None),
    ("5. Comparaison des modèles et accuracy", 0, False, None),
    ("6. Calculs métier : écart, risque, recommandation", 0, False, None),
    ("7. Gouvernance, traçabilité et limites assumées", 0, False, None),
    ("8. Tableau de bord décisionnel", 0, False, None),
    ("9. Conclusion et perspectives", 0, False, None),
])

# 3. En bref
add_slide("Le sprint en bref", [
    ("Le projet apprend à ANTICIPER : il prédit l'évolution des écarts de compétences à 3 mois", 0, True, BLEU2),
    ("Trois sorties : écarts prédits + sévérité · score de risque explicable · formations recommandées", 0, False, None),
    ("Modèle gagnant : Gradient Boosting — RMSE 0,6376 · R² 0,534 · accuracy 90,3 % à ±1 point", 0, True, VERT),
    ("Modèle choisi par comparaison mesurée avec 4 autres approches (protocole identique)", 1, False, None),
    ("Chaque réponse indique le moteur réellement utilisé et, en cas de repli, sa raison", 0, False, None),
    ("Gouvernance : un modèle non prouvé est refusé (cas du modèle de risque, rejeté)", 0, False, ROUGE),
])

# 4. Objectifs et chaîne de traitement
add_slide("Objectifs et chaîne de traitement", [
    ("1. Calculer l'écart requis/observé et le qualifier (CRITIQUE ≥ 0,75 · HAUTE ≥ 0,50 · MOYENNE ≥ 0,25)", 0, False, None),
    ("2. Prédire l'évolution de cet écart à 3 mois (gap M+3)", 0, False, None),
    ("3. Produire un score de risque explicable avec ses contributions", 0, False, None),
    ("4. Recommander des formations classées et justifiées", 0, False, None),
    ("5. Tracer le moteur ayant produit chaque résultat (ML ou heuristique)", 0, False, None),
    ("Chaîne : JWT/RBAC → périmètre autorisé → lecture des schémas métier (lecture seule) → 29 caractéristiques → validation des plages → prédiction ML ou heuristique → persistance tracée → risque → recommandations et tableaux de bord", 1, True, BLEU2),
])

# 5. API et contrat
add_slide("API et contrat de service", [
    ("Routes : /teachers/{id}/gaps | risk | recommendations | scope-analysis · POST /analysis/{id} · /dashboard/real/impact | /alerts | /model-health", 0, False, None),
    ("Contrat exposé dans chaque réponse : model_mode, model_version, model_name, fallback_reason", 0, True, VERT),
    ("Une ligne produite par le modèle porte DECLARED_ML ; une ligne heuristique porte HEURISTIC_FALLBACK", 1, False, None),
    ("En cas d'incohérence, le repli est toujours annoncé — jamais un mode ML inexact", 1, False, None),
    ("Le microservice ne modifie aucune donnée métier : il observe et produit des indicateurs", 0, False, None),
])

# 6. Le modèle gagnant
add_slide("Le modèle gagnant : Gradient Boosting", [
    ("Le choix n'est pas arbitraire : 5 familles d'algorithmes entraînées sous le MÊME protocole (split temporel, graine 42)", 0, False, None),
    ("Vainqueur sur les trois familles d'indicateurs : erreur, variance expliquée, accuracy", 0, True, VERT),
    ("RMSE 0,6376 · MAE 0,4578 · R² 0,534 · accuracy 62,3 % à ±0,5 point et 90,3 % à ±1 point", 0, True, VERT),
    ("Contrôles avant chargement : SHA-256 de l'artefact, statut registre, schéma des features, provenance, seuils de métriques", 1, False, None),
    ("Hors plages d'entraînement → bascule explicite en heuristique (mode fail-closed)", 1, False, None),
])

# 7. Comparaison des candidats
add_table_slide(
    "Comparaison des modèles candidats",
    ["Modèle", "RMSE (CV)", "RMSE test", "R²", "Décision"],
    [
        ["Baseline persistance", "-", "2,1870", "-", "Référence"],
        ["Gradient Boosting", "1,2924", "1,3053", "0,1958", "Gagnant — ACTIVE"],
        ["XGBoost challenger", "1,3244", "-", "-", "Non retenu"],
        ["Perceptron multicouche", "1,4705", "-", "-", "Rejeté"],
    ],
    note="Protocole identique pour tous : découpage temporel strict, graine fixe 42. Le gain du modèle retenu est net face à la baseline de persistance.")

# 8. Accuracy
add_table_slide(
    "Tableau comparatif de l'accuracy",
    ["Modèle", "Acc. ±0,5", "Acc. ±1,0", "R²", "Décision"],
    [
        ["Gradient Boosting", "62,3 %", "90,3 %", "0,534", "Gagnant — modèle retenu"],
        ["Ridge", "62,7 %", "88,3 %", "0,514", "Proche second"],
        ["Perceptron multicouche", "60,3 %", "86,0 %", "0,479", "Dépassé"],
        ["Persistance", "20,9 %", "39,5 %", "-0,931", "Erreur 2× supérieure"],
        ["XGBoost", "-", "-", "0,278", "Refusé (gain non significatif)"],
    ],
    note="Accuracy à tolérance (échelle 0-5) : part des prédictions à moins de ±0,5 puis ±1 point de la valeur réelle. La persistance « devine » les cas stables mais se trompe lourdement ailleurs — d'où un critère combinant erreur, R², accuracy et intervalle de confiance à 95 %.")

# 9. Calculs métier
add_slide("Calculs métier : écart, risque, recommandation", [
    ("Écart servi = le plus sévère entre le manque actuel (requis − niveau observé) et l'écart prédit à 3 mois, normalisé sur 4 et borné à 1", 0, False, None),
    ("Sévérité : CRITIQUE ≥ 0,75 · HAUTE ≥ 0,50 · MOYENNE ≥ 0,25", 1, False, None),
    ("Risque = 0,50×criticité + 0,12×gaps hautes + 0,40×profondeur — chaque contribution affichée", 0, False, None),
    ("Le classifieur de risque a été REFUSÉ (macro-F1 0,525 < 0,70) : l'indice pondéré explicable est conservé", 1, True, ROUGE),
    ("Recommandations : contenu 0,70 / qualité 0,20 / récence 0,10, rang dès 1, statut SUGGESTED — justifiées par les savoirs manquants réels", 0, False, None),
])

# 10. Gouvernance
add_slide("Gouvernance et traçabilité", [
    ("Artefacts versionnés et signés SHA-256 ; vérification de l'empreinte à chaque chargement", 0, False, None),
    ("Promotion contrôlée par un registre : archivage de la version remplacée, retour arrière possible", 0, True, BLEU2),
    ("Chargement refusé si l'artefact est absent, corrompu, non approuvé ou incompatible", 1, False, None),
    ("Chaque ligne persistée trace son origine : modèle (DECLARED_ML) ou heuristique (HEURISTIC_FALLBACK)", 0, False, None),
    ("Le service refuse de servir un modèle dont la supériorité n'est pas démontrée — c'est une propriété de sécurité du code, couverte par tests", 0, True, VERT),
])

# 11. Limites assumées
add_slide("Limites assumées et instrumentées", [
    ("Cible extrapolée : gap M+3 dérivé de l'historique (target_validity=EXTRAPOLATED_TARGET) — badge affiché dans l'interface, re-mesures historisées", 0, False, None),
    ("Corpus limité : validation multi-fenêtres armée mais refusée sous 500 lignes / 6 mois ; snapshot mensuel déjà planifié", 0, False, None),
    ("Risque non calibré : score_type=WEIGHTED_HEURISTIC_INDEX, calibration_status=NOT_CALIBRATED — étude de calibration menée sur simulation", 0, False, None),
    ("Enseignants hors plages : bascule heuristique explicite et journalisée, avertissement non bloquant près des bornes", 0, False, None),
    ("Aucune limite n'est masquée : chacune est écrite dans le rapport, instrumentée et sous surveillance", 0, True, ROUGE),
])

# 12. Tableau de bord
add_slide("Tableau de bord décisionnel", [
    ("Offre et demande par compétence : quadrant de décision (exemple vérifié : Backend, demande 0,70 / offre 0,00 → INVESTIR)", 0, False, None),
    ("Besoins en formation déclarés : indicateurs du tableau de bord + 2 caractéristiques du modèle", 0, False, None),
    ("Impact des formations suivies : 17 enseignants suivis, 16 formations, gain moyen de 2,56 niveaux", 0, False, None),
    ("Alertes typées avec cycle de traitement · série mensuelle du risque · carte département × compétence avec accès direct", 0, False, None),
    ("Toutes les données affichées sont vérifiables via l'API", 1, True, BLEU2),
])

# 13. Conclusion
add_slide("Conclusion et perspectives", [
    ("Un modèle retenu SUR PREUVE : Gradient Boosting, comparé à 4 approches sous protocole identique", 0, True, VERT),
    ("Une gouvernance qui REFUSE : classifieur de risque écarté, bascule heuristique explicite hors domaine", 0, True, ROUGE),
    ("Une honnêteté DOCUMENTÉE : corpus et limites écrits noir sur blanc, aucune métrique présentée au-delà de sa portée", 0, True, BLEU2),
    ("Perspective : validation institutionnelle (attestation DSI + 30 re-mesures réelles sur ≥ 3 mois)", 0, False, None),
    ("« Le service est exploitable dès aujourd'hui en démonstration et en appui à la décision, avec une traçabilité complète. »", 0, True, BLEU2),
])

prs.save(OUT)
print("OK:", OUT, "| slides:", len(prs.slides._sldIdLst))
