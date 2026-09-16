-- V3__seed_sample_certificates.sql
-- Données d'exemple : certificats pour la formation TERMINEE (formation_id=1)
-- Idempotent : WHERE NOT EXISTS sur (formation_id, enseignant_id, type_certif)

-- ── Formation 1 — Atelier Spring Boot 3 & JPA Avancé (TERMINEE) ───────────────

-- Certificat de participation — ENS001 (Karim TRABELSI)
INSERT INTO certificates (
    formation_id, titre_formation, type_certif,
    date_debut_formation, date_fin_formation, charge_horaire_global,
    enseignant_id, nom_enseignant, prenom_enseignant, mail_enseignant,
    dept_enseignant, role_en_formation, delivered
)
SELECT
    1, 'Atelier Spring Boot 3 & JPA Avancé', 'PARTICIPANT',
    '2026-01-15', '2026-02-28', 30,
    'ENS001', 'TRABELSI', 'Karim', 'k.trabelsi@esprit.tn',
    'Département Informatique', 'PARTICIPANT', true
WHERE NOT EXISTS (
    SELECT 1 FROM certificates
    WHERE formation_id = 1 AND enseignant_id = 'ENS001' AND type_certif = 'PARTICIPANT'
);

-- Certificat de participation — ENS002 (Sonia MANSOURI)
INSERT INTO certificates (
    formation_id, titre_formation, type_certif,
    date_debut_formation, date_fin_formation, charge_horaire_global,
    enseignant_id, nom_enseignant, prenom_enseignant, mail_enseignant,
    dept_enseignant, role_en_formation, delivered
)
SELECT
    1, 'Atelier Spring Boot 3 & JPA Avancé', 'PARTICIPANT',
    '2026-01-15', '2026-02-28', 30,
    'ENS002', 'MANSOURI', 'Sonia', 's.mansouri@esprit.tn',
    'Département Génie Logiciel', 'PARTICIPANT', true
WHERE NOT EXISTS (
    SELECT 1 FROM certificates
    WHERE formation_id = 1 AND enseignant_id = 'ENS002' AND type_certif = 'PARTICIPANT'
);

-- Certificat de participation — ENS003 (Amine GHARBI)
-- Note : présence partielle (2/4 séances) — certificat non délivré
INSERT INTO certificates (
    formation_id, titre_formation, type_certif,
    date_debut_formation, date_fin_formation, charge_horaire_global,
    enseignant_id, nom_enseignant, prenom_enseignant, mail_enseignant,
    dept_enseignant, role_en_formation, delivered
)
SELECT
    1, 'Atelier Spring Boot 3 & JPA Avancé', 'PARTICIPANT',
    '2026-01-15', '2026-02-28', 30,
    'ENS003', 'GHARBI', 'Amine', 'a.gharbi@esprit.tn',
    'Département Réseaux', 'PARTICIPANT', false
WHERE NOT EXISTS (
    SELECT 1 FROM certificates
    WHERE formation_id = 1 AND enseignant_id = 'ENS003' AND type_certif = 'PARTICIPANT'
);

-- Certificat de formateur — FORM001 (Jean DUPONT)
INSERT INTO certificates (
    formation_id, titre_formation, type_certif,
    date_debut_formation, date_fin_formation, charge_horaire_global,
    enseignant_id, nom_enseignant, prenom_enseignant, mail_enseignant,
    dept_enseignant, role_en_formation, delivered
)
SELECT
    1, 'Atelier Spring Boot 3 & JPA Avancé', 'FORMATEUR',
    '2026-01-15', '2026-02-28', 30,
    'FORM001', 'DUPONT', 'Jean', 'j.dupont@formation-pro.tn',
    'Formateur externe', 'FORMATEUR', true
WHERE NOT EXISTS (
    SELECT 1 FROM certificates
    WHERE formation_id = 1 AND enseignant_id = 'FORM001' AND type_certif = 'FORMATEUR'
);
