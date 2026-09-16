-- V14__seed_sample_evaluations.sql
-- Données d'exemple : évaluations de la formation TERMINEE (formation_id=1)
-- et évaluations individuelles des participants
-- Idempotent : WHERE NOT EXISTS sur formation_id

-- ── Évaluation globale — Formation 1 (Atelier Spring Boot, TERMINEE) ──────────
INSERT INTO evaluation_globale (
    formation_id,
    commentaire_general,
    date_evaluation,
    note_globale,
    recommandation
)
SELECT
    1,
    'Formation très appréciée par les participants. Le contenu était pertinent et bien adapté au niveau des enseignants. '
    'Les travaux pratiques ont été particulièrement utiles. Quelques ajustements souhaitables sur la durée des séances.',
    '2026-02-28',
    4.2,
    'RENOUVELER'
WHERE NOT EXISTS (SELECT 1 FROM evaluation_globale WHERE formation_id = 1);

-- ── Évaluations individuelles (évaluation_formateur) — Formation 1 ───────────
-- Note du formateur principal (FORM001 / Jean DUPONT)
INSERT INTO evaluation_formateur (
    note, satisfaisant, commentaire, enseignant_id, formation_id
)
SELECT 4.5, true,
       'Formateur très compétent, pédagogie claire et exemples concrets. A su adapter le niveau aux participants.',
       'FORM001', 1
WHERE NOT EXISTS (
    SELECT 1 FROM evaluation_formateur
    WHERE enseignant_id = 'FORM001' AND formation_id = 1
);

-- Évaluation du participant ENS001
INSERT INTO evaluation_formateur (
    note, satisfaisant, commentaire, enseignant_id, formation_id
)
SELECT 4.5, true,
       'Excellent niveau de maîtrise du sujet. Les exercices pratiques étaient très formateurs.',
       'ENS001', 1
WHERE NOT EXISTS (
    SELECT 1 FROM evaluation_formateur
    WHERE enseignant_id = 'ENS001' AND formation_id = 1
);

-- Évaluation du participant ENS002
INSERT INTO evaluation_formateur (
    note, satisfaisant, commentaire, enseignant_id, formation_id
)
SELECT 4.0, true,
       'Bonne formation, contenu dense mais bien structuré. Aurait aimé plus de temps sur Spring Security.',
       'ENS002', 1
WHERE NOT EXISTS (
    SELECT 1 FROM evaluation_formateur
    WHERE enseignant_id = 'ENS002' AND formation_id = 1
);

-- Évaluation du participant ENS003
INSERT INTO evaluation_formateur (
    note, satisfaisant, commentaire, enseignant_id, formation_id
)
SELECT 3.5, true,
       'Formation correcte. Le rythme était un peu soutenu par moment. Les labs docker très appréciés.',
       'ENS003', 1
WHERE NOT EXISTS (
    SELECT 1 FROM evaluation_formateur
    WHERE enseignant_id = 'ENS003' AND formation_id = 1
);

-- ── Évaluation globale — Formation 2 (Sécurité Web, EN_COURS, séances passées) ─
INSERT INTO evaluation_globale (
    formation_id,
    commentaire_general,
    date_evaluation,
    note_globale,
    recommandation
)
SELECT
    2,
    'Évaluation intermédiaire après les 2 premières séances. Très bon accueil. '
    'Les participants sont très engagés. Les labs pratiques DVWA sont un point fort.',
    '2026-05-01',
    4.0,
    'CONTINUER'
WHERE NOT EXISTS (SELECT 1 FROM evaluation_globale WHERE formation_id = 2);
