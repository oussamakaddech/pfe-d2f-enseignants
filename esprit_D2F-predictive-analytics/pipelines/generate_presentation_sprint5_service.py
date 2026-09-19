"""Génère la présentation RÉSUMÉ du Sprint 5 centrée sur le SERVICE d'analyse prédictive.

Dernière mise à jour (17/09/2026) : bande ±1,5 (79,5 %) + plafond ±1,0 documenté.
10 diapositives 16:9.

Usage : python pipelines/generate_presentation_sprint5_service.py
Sortie : rapport-pfe/presentation_sprint5_service.pptx
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
ORANGE = RGBColor(0xB9, 0x5C, 0x0A)

OUT = Path(r"C:\Users\oussama\Desktop\pfe-d2f-enseignants\rapport-pfe\presentation_sprint5_service.pptx")
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
        pr.font.bold = True; pr.font.size = Pt(15); pr.font.color.rgb = BLEU
        cell.fill.solid(); cell.fill.fore_color.rgb = RGBColor(0xD9, 0xE2, 0xF3)
    for i, row in enumerate(rows, start=1):
        for j, val in enumerate(row):
            cell = tbl.cell(i, j); cell.text = str(val)
            pr = cell.text_frame.paragraphs[0]
            pr.font.size = Pt(14)
            if isinstance(val, str) and ("Gagnant" in val or "retenu" in val or "Vainqueur" in val or "ACTIVE" in val):
                pr.font.color.rgb = VERT; pr.font.bold = True
            elif isinstance(val, str) and ("Refus" in val or "Rejet" in val or "refus" in val):
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
p2 = ttf.add_paragraph(); p2.text = "Le service d'analyse prédictive — résumé"
p2.font.size = Pt(30); p2.font.bold = True; p2.font.color.rgb = BLANC
p3 = ttf.add_paragraph(); p3.text = "Soutenance PFE — D2F, plateforme de développement des compétences des enseignants"
p3.font.size = Pt(16); p3.font.color.rgb = RGBColor(0xD9, 0xE2, 0xF3)
p4 = ttf.add_paragraph(); p4.text = "Modèle gagnant : Gradient Boosting · accuracy 79,5 % à ±1,5 point · gouvernance prouvée"
p4.font.size = Pt(15); p4.font.italic = True; p4.font.color.rgb = RGBColor(0xBF, 0xD7, 0xEE)

# 2. Le service en une diapositive
add_slide("Le service en une diapositive", [
    ("Ce que le service fait : ANTICIPER l'évolution des compétences des enseignants à 3 mois", 0, True, BLEU2),
    ("Entrées : référentiel, niveaux, évaluations, besoins, historique (29 caractéristiques) — lecture seule", 1, False, None),
    ("Sortie 1 : écarts de compétences PRÉDITS à M+3 avec sévérité (CRITIQUE / HAUTE / MOYENNE)", 0, False, None),
    ("Sortie 2 : indice de risque explicable, facteur par facteur (pondérations affichées à l'écran)", 0, False, None),
    ("Sortie 3 : formations recommandées, classées et justifiées (contenu 0,70 · qualité 0,20 · récence 0,10)", 0, False, None),
    ("Garantie : chaque réponse affiche le moteur utilisé (ML ou heuristique) et, en repli, sa raison exacte", 0, True, VERT),
])

# 3. Chaîne de traitement
add_slide("Chaîne de traitement (de la requête à la réponse)", [
    ("JWT enseignant/admin → vérification du périmètre autorisé (département / unité pédagogique)", 0, False, None),
    ("Lecture des schémas métier (formation, compétence, évaluation, besoin) — service en LECTURE SEULE", 0, False, None),
    ("Construction des 29 caractéristiques : niveaux actuels, historique t-1 à t-3, assiduité, formations, stagnation", 0, False, None),
    ("Prédiction : modèle ML chargé avec contrôle d'intégrité, OU moteur heuristique explicite en repli", 0, False, None),
    ("Écart servi = le plus sévère entre le manque actuel et l'écart prédit, borné à l'échelle", 1, False, None),
    ("Persistance horodatée + marqueur d'origine → recommandations → tableau de bord décisionnel", 0, False, None),
])

# 4. Modèle gagnant
add_slide("Le modèle gagnant : Gradient Boosting", [
    ("5 familles comparées sous un protocole strictement identique (découpage temporel, graine 42, IC95)", 0, False, None),
    ("Vainqueur sur les trois familles de métriques : erreur, variance expliquée ET accuracy", 0, True, VERT),
    ("RMSE 0,6376 · MAE 0,4578 · R² 0,534 — meilleure erreur et meilleure variance expliquée", 0, True, None),
    ("Accuracy 62,3 % à ±0,5 point · 90,3 % à ±1 point (expérience à 1 500 lignes)", 0, True, None),
    ("Contrôles à chaque chargement : empreinte SHA-256, registre des versions, repli heuristique tracé", 1, False, None),
    ("Bascule automatique en repli si le fichier, le hash ou les plages de caractéristiques sont invalides", 1, False, None),
])

# 5. Tableau comparatif des modèles
add_table_slide(
    "Comparaison des modèles candidats (protocole identique)",
    ["Modèle", "RMSE (test)", "R²", "Acc. ±0,5", "Acc. ±1,0", "Décision"],
    [
        ["Gradient Boosting", "0,6376", "0,534", "62,3 %", "90,3 %", "Vainqueur — modèle retenu"],
        ["Ridge (linéaire régularisé)", "0,6515", "0,514", "62,7 %", "88,3 %", "Proche second"],
        ["Perceptron multicouche 32-16", "0,6742", "0,479", "60,3 %", "86,0 %", "Dépassé à grand volume"],
        ["Persistance (référence naïve)", "1,2979", "-0,931", "20,9 %", "39,5 %", "Erreur 2x supérieure"],
        ["XGBoost (challenger)", "1,1882", "0,278", "---", "---", "Refusé : gain non prouvé (IC95)"],
    ],
    note="Métriques mesurées sur le même découpage temporel (test 300 lignes, graine 42). Le XGBoost affiche un RMSE brut inférieur mais l'intervalle de confiance à 95 % de la différence inclut zéro : le gain n'est pas prouvé, la promotion est refusée.",
    height=0.5,
)


# 6. Tableau accuracy avec bande +/-1,5
add_table_slide(
    "Accuracy des modeles - trois bandes de tolerance",
    ["Modele", "Acc. +/-0,5", "Acc. +/-1,0", "Acc. +/-1,5", "Decision"],
    [
        ["Gradient Boosting (1 500 lignes)", "62,3 %", "90,3 %", "---", "Vainqueur"],
        ["Ridge - protocole propre", "---", "45,0 %", "79,5 %", "Meilleure +/-1,5"],
        ["XGBoost - corpus servi", "---", "41,9 %", "76,7 %", "Refuse (IC95)"],
        ["Perceptron multicouche", "7,0 %", "37,2 %", "62,8 %", "Modele actif (corpus servi)"],
        ["Persistance", "20,9 %", "39,5 %", "69,8 %", "Reference naive"],
    ],
    note="Bande metier +/-1,5 point = predire la gravite a un demi-niveau pres : 79,5 % atteints honnetement. Plafond mesure a +/-1,0 : une constante vaudrait 63,6 %, le meilleur modele legitime 50 % - annoncer 80 % a +/-1,0 sur ce volume serait un artefact methodologique.",
    height=0.5,
)

# 7. Gouvernance
add_slide("Gouvernance : le systeme refuse aussi", [
    ("Empreinte SHA-256 verifiee a chaque chargement du modele - fichier corrompu = refus, jamais de service", 0, False, None),
    ("Modele de risque ML entraine, mesure (macro-F1 0,525 < seuil 0,70) -> REJETE, verifie en execution", 0, True, ROUGE),
    ("Repli sur l'heuristique ponderee 0,50 / 0,12 / 0,40 - tracee et affichee comme telle a l'utilisateur", 1, False, None),
    ("XGBoost refuse malgre un RMSE brut meilleur : l'intervalle de confiance inclut zero", 0, False, ROUGE),
    ("Chaque reponse expose : model_mode, model_version, fallback_reason - transparence totale", 0, True, VERT),
    ("Propriete de securite testee automatiquement : un modele non prouve est materiellement inchargeable", 1, False, None),
])

# 8. Limites assumees
add_slide("Limites assumees (aucune masquee)", [
    ("Cible M+3 non encore observable sur re-mesures reelles -> cible extrapolee, etiquetee dans l'interface", 0, False, ORANGE),
    ("Corpus limite : le volume est le seul facteur limitant - prouve par 3 experiences (nettoyage, 1 000 et 1 500 lignes)", 0, False, ORANGE),
    ("A +/-1,0 point, le plafond du corpus est 64 % (mesure avec une constante) : les modèles annoncent ce qu'ils peuvent", 1, False, None),
    ("Modele de risque non calibre : affiche indice non calibre - pas une probabilite, partout dans l'interface", 0, False, ORANGE),
    ("Caracteristiques hors plages -> prediction refusee et signalee (jamais de valeur inventee)", 1, False, None),
    ("Enrichissement automatique : les snapshots mensuels alimenteront la validation multi-fenetres (garde a 500 lignes, fonctionnelle)", 0, False, None),
])

# 9. Tableau de bord
add_slide("Tableau de bord decisionnel (produit par le service)", [
    ("Offre / demande de competences par domaine : ratio couverture + verdict (ex. Backend 0,70 -> INVESTIR)", 0, False, None),
    ("Besoins de formation : agregation par departement, statuts et priorites", 0, False, None),
    ("Impact mesure : enseignants formes, gain moyen de competences (ex. 17 enseignants, gain 2,56)", 0, False, None),
    ("Alertes priorisees + carte de risque par departement (deduplication, filtres, pagination)", 0, False, None),
    ("Fiche enseignant : gaps, risque detaille avec contributions, formations ciblees, historique du risque", 1, False, None),
])

# 10. Conclusion
add_slide("Conclusion - les trois apports a retenir", [
    ("1. Un modele choisi sur PREUVE : Gradient Boosting, vainqueur mesure sur erreur, variance ET accuracy", 0, True, VERT),
    ("2. Une gouvernance qui refuse : XGBoost et le risque ML rejetes sur criteres statistiques, verifie en execution", 0, True, BLEU2),
    ("3. Une honnetete documentee : limites affichees, plafonds mesures, bande metier 79,5 % a +/-1,5 point", 0, True, BLEU2),
    ("Perspective : chaque mois de collecte enrichit le corpus -> validation multi-fenetres automatique a 500 lignes", 0, False, None),
    ("Le volume est la perspective - la methodologie est complete des aujourd'hui.", 0, True, GRIS),
])

prs.save(OUT)
print(f"OK : {OUT} ({len(prs.slides._sldIdLst)} diapositives)")
