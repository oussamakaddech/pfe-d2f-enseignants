-- ==========================================================================
-- Seed D2F-JAVA + D2F-WEB — Version corrigée — Idempotent
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- UNIQUE GUARD — prérequis pour ON CONFLICT (enseignant_id, savoir_id)
-- ==========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_ec_enseignant_savoir
  ON enseignant_competences (enseignant_id, savoir_id);

-- ==========================================================================
-- NORMALISATION FK — DROP IF EXISTS (idempotent, sans LIKE fragile)
-- ==========================================================================
ALTER TABLE competence_prerequisite
  DROP CONSTRAINT IF EXISTS fk_cp_competence_cascade,
  DROP CONSTRAINT IF EXISTS fk_cp_prerequisite_cascade;

ALTER TABLE competence_prerequisite
  ADD CONSTRAINT fk_cp_competence_cascade
    FOREIGN KEY (competence_id)  REFERENCES competences(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_cp_prerequisite_cascade
    FOREIGN KEY (prerequisite_id) REFERENCES competences(id) ON DELETE CASCADE;

ALTER TABLE sous_competences
  DROP CONSTRAINT IF EXISTS fk_sc_competence_restrict;

ALTER TABLE sous_competences
  ADD CONSTRAINT fk_sc_competence_restrict
    FOREIGN KEY (competence_id) REFERENCES competences(id);

ALTER TABLE savoirs
  DROP CONSTRAINT IF EXISTS fk_savoirs_competence_restrict,
  DROP CONSTRAINT IF EXISTS fk_savoirs_sous_comp_restrict;

ALTER TABLE savoirs
  ADD CONSTRAINT fk_savoirs_competence_restrict
    FOREIGN KEY (competence_id)     REFERENCES competences(id),
  ADD CONSTRAINT fk_savoirs_sous_comp_restrict
    FOREIGN KEY (sous_competence_id) REFERENCES sous_competences(id);

ALTER TABLE enseignant_competences
  DROP CONSTRAINT IF EXISTS fk_ec_savoir_restrict;

ALTER TABLE enseignant_competences
  ADD CONSTRAINT fk_ec_savoir_restrict
    FOREIGN KEY (savoir_id) REFERENCES savoirs(id);

ALTER TABLE niveau_savoir_requis
  DROP CONSTRAINT IF EXISTS fk_nsr_competence_restrict,
  DROP CONSTRAINT IF EXISTS fk_nsr_sous_comp_restrict,
  DROP CONSTRAINT IF EXISTS fk_nsr_savoir_restrict;

ALTER TABLE niveau_savoir_requis
  ADD CONSTRAINT fk_nsr_competence_restrict
    FOREIGN KEY (competence_id)     REFERENCES competences(id),
  ADD CONSTRAINT fk_nsr_sous_comp_restrict
    FOREIGN KEY (sous_competence_id) REFERENCES sous_competences(id),
  ADD CONSTRAINT fk_nsr_savoir_restrict
    FOREIGN KEY (savoir_id)         REFERENCES savoirs(id);

-- ==========================================================================
-- NETTOYAGE PRÉALABLE (ordre FK respecté)
-- ==========================================================================
DELETE FROM enseignant_competences
  WHERE savoir_id IN (
    SELECT id FROM savoirs WHERE code LIKE 'JAVA-%' OR code LIKE 'WEB-%'
  );

DELETE FROM competence_prerequisite
  WHERE competence_id IN (SELECT id FROM competences WHERE code LIKE 'JAVA-%' OR code LIKE 'WEB-%')
     OR prerequisite_id IN (SELECT id FROM competences WHERE code LIKE 'JAVA-%' OR code LIKE 'WEB-%');

DELETE FROM savoirs         WHERE code LIKE 'JAVA-%' OR code LIKE 'WEB-%';
DELETE FROM sous_competences WHERE code LIKE 'WEB-%';
DELETE FROM competences     WHERE code LIKE 'JAVA-%' OR code LIKE 'WEB-%';
DELETE FROM domaines        WHERE code IN ('D2F-JAVA','D2F-WEB');

-- ==========================================================================
-- DOMAINE 1 — D2F-JAVA (savoirs liés DIRECTEMENT aux compétences)
-- ==========================================================================
INSERT INTO domaines (code, nom, description, actif)
VALUES ('D2F-JAVA','Développement Java','Savoirs rattachés directement aux compétences.',true)
ON CONFLICT (code) DO UPDATE
  SET nom = EXCLUDED.nom, description = EXCLUDED.description, actif = EXCLUDED.actif;

INSERT INTO competences (code, nom, description, ordre, domaine_id)
VALUES
  ('JAVA-ALGO',   'Algorithmique Java',  'Structures de données et complexité.',  1, (SELECT id FROM domaines WHERE code='D2F-JAVA')),
  ('JAVA-BASE',   'Java SE Fondamentaux','POO, collections, streams.',             2, (SELECT id FROM domaines WHERE code='D2F-JAVA')),
  ('JAVA-SPRING', 'Java Spring Boot',    'API REST robustes avec Spring Boot.',    3, (SELECT id FROM domaines WHERE code='D2F-JAVA')),
  ('JAVA-TEST',   'Qualité et Tests',    'Tests unitaires et quality gate.',       4, (SELECT id FROM domaines WHERE code='D2F-JAVA'))
ON CONFLICT (code) DO UPDATE
  SET nom=EXCLUDED.nom, description=EXCLUDED.description,
      ordre=EXCLUDED.ordre, domaine_id=EXCLUDED.domaine_id;

-- 4 exemples — compétence_id non null, sous_competence_id = NULL
INSERT INTO savoirs (code, nom, description, type, niveau, competence_id, sous_competence_id)
VALUES
  ('JAVA-ALGO-S1', 'Écrire un algorithme clair',       'Pseudo-code lisible et testable.',        'PRATIQUE',  'N1_DEBUTANT',      (SELECT id FROM competences WHERE code='JAVA-ALGO'),   NULL),
  ('JAVA-BASE-S1', 'Concevoir des classes robustes',   'Principes OO en Java SE.',                'PRATIQUE',  'N2_ELEMENTAIRE',   (SELECT id FROM competences WHERE code='JAVA-BASE'),   NULL),
  ('JAVA-SPRING-S1','Construire une API REST',          'Endpoints, DTO, validation, mapping.',    'PRATIQUE',  'N3_INTERMEDIAIRE', (SELECT id FROM competences WHERE code='JAVA-SPRING'), NULL),
  ('JAVA-TEST-S1', 'Écrire des tests unitaires JUnit', 'Tester la logique métier en isolation.',  'PRATIQUE',  'N3_INTERMEDIAIRE', (SELECT id FROM competences WHERE code='JAVA-TEST'),   NULL)
ON CONFLICT (code) DO UPDATE
  SET nom=EXCLUDED.nom, description=EXCLUDED.description,
      type=EXCLUDED.type, niveau=EXCLUDED.niveau,
      competence_id=EXCLUDED.competence_id, sous_competence_id=NULL;

-- ==========================================================================
-- DOMAINE 2 — D2F-WEB (savoirs liés via SOUS-COMPÉTENCES)
-- ==========================================================================
INSERT INTO domaines (code, nom, description, actif)
VALUES ('D2F-WEB','Développement Web Full-Stack','Savoirs organisés via sous-compétences.',true)
ON CONFLICT (code) DO UPDATE
  SET nom=EXCLUDED.nom, description=EXCLUDED.description, actif=EXCLUDED.actif;

INSERT INTO competences (code, nom, description, ordre, domaine_id)
VALUES
  ('WEB-FRONT',  'Développement Frontend', 'JS, HTML/CSS et frameworks modernes.',  1, (SELECT id FROM domaines WHERE code='D2F-WEB')),
  ('WEB-REACT',  'React & Écosystème',     'Composants, state, routing React.',      2, (SELECT id FROM domaines WHERE code='D2F-WEB')),
  ('WEB-API',    'API & Backend Node.js',  'API REST/GraphQL avec Node.js.',         3, (SELECT id FROM domaines WHERE code='D2F-WEB')),
  ('WEB-DEVOPS', 'DevOps Web',             'CI/CD, Docker et déploiement cloud.',    4, (SELECT id FROM domaines WHERE code='D2F-WEB'))
ON CONFLICT (code) DO UPDATE
  SET nom=EXCLUDED.nom, description=EXCLUDED.description,
      ordre=EXCLUDED.ordre, domaine_id=EXCLUDED.domaine_id;

-- niveau INTEGER ici (≠ enum dans savoirs) — comportement voulu par le schéma
INSERT INTO sous_competences (code, nom, description, competence_id, niveau)
VALUES
  ('WEB-FRONT-SC1', 'HTML/CSS & Intégration',  'HTML5, CSS3, Flexbox, Grid.',          (SELECT id FROM competences WHERE code='WEB-FRONT'),  1),
  ('WEB-FRONT-SC2', 'JavaScript Moderne',       'ES6+, async/await, DOM, fetch.',       (SELECT id FROM competences WHERE code='WEB-FRONT'),  1),
  ('WEB-REACT-SC1', 'Composants & Hooks React', 'useState, useEffect, useContext.',     (SELECT id FROM competences WHERE code='WEB-REACT'),  1),
  ('WEB-API-SC1',   'API REST avec Express',    'Routing, middleware, validation.',     (SELECT id FROM competences WHERE code='WEB-API'),    1)
ON CONFLICT (code) DO UPDATE
  SET nom=EXCLUDED.nom, description=EXCLUDED.description,
      competence_id=EXCLUDED.competence_id, niveau=EXCLUDED.niveau;

-- 4 exemples — sous_competence_id non null, competence_id = NULL
INSERT INTO savoirs (code, nom, description, type, niveau, sous_competence_id, competence_id)
VALUES
  ('WEB-FRONT-S1', 'Structurer avec HTML5 sémantique', 'Balises sémantiques, accessibilité, SEO.', 'THEORIQUE', 'N1_DEBUTANT',      (SELECT id FROM sous_competences WHERE code='WEB-FRONT-SC1'), NULL),
  ('WEB-FRONT-S4', 'Manipuler le DOM avec JavaScript', 'Sélecteurs, événements, DOM dynamique.',   'PRATIQUE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='WEB-FRONT-SC2'), NULL),
  ('WEB-REACT-S1', 'Créer des composants fonctionnels','Props, JSX, listes, rendu conditionnel.',  'PRATIQUE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='WEB-REACT-SC1'), NULL),
  ('WEB-API-S1',   'Créer une API REST avec Express',  'Routes, CORS, middleware, erreurs.',       'PRATIQUE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='WEB-API-SC1'),   NULL)
ON CONFLICT (code) DO UPDATE
  SET nom=EXCLUDED.nom, description=EXCLUDED.description,
      type=EXCLUDED.type, niveau=EXCLUDED.niveau,
      sous_competence_id=EXCLUDED.sous_competence_id, competence_id=NULL;

-- ==========================================================================
-- PRÉREQUIS
-- ==========================================================================
INSERT INTO competence_prerequisite (competence_id, prerequisite_id, niveau_minimum, description)
SELECT c.id, p.id, niv, desc_
FROM (VALUES
  ('JAVA-BASE',   'JAVA-ALGO',  'N2_ELEMENTAIRE',   'Java Base requiert les fondamentaux algo'),
  ('JAVA-SPRING', 'JAVA-BASE',  'N3_INTERMEDIAIRE',  'Spring requiert Java SE'),
  ('WEB-REACT',   'WEB-FRONT',  'N2_ELEMENTAIRE',   'React nécessite les bases frontend'),
  ('WEB-DEVOPS',  'WEB-API',    'N3_INTERMEDIAIRE',  'DevOps déploie le backend API')
) AS v(c_code, p_code, niv, desc_)
JOIN competences c ON c.code = v.c_code
JOIN competences p ON p.code = v.p_code
ON CONFLICT (competence_id, prerequisite_id) DO UPDATE
  SET niveau_minimum=EXCLUDED.niveau_minimum, description=EXCLUDED.description;

-- ==========================================================================
-- UPs, DÉPARTEMENTS, ENSEIGNANTS
-- ==========================================================================
INSERT INTO ups (id, libelle) VALUES
  ('UP-INF','UP Informatique'), ('UP-WEB','UP Technologies Web')
ON CONFLICT (id) DO UPDATE SET libelle=EXCLUDED.libelle;

INSERT INTO departements (id, libelle) VALUES
  ('DEP-GL','Génie Logiciel'), ('DEP-WEB','Développement Web')
ON CONFLICT (id) DO UPDATE SET libelle=EXCLUDED.libelle;

INSERT INTO enseignants (id, nom, prenom, mail, type, etat, cup, chefdepartement, up_id, dept_id)
VALUES
  ('E90001','Ben Salem','Oussama','oussama.bensalem@esprit.tn', 'P','A','N','N','UP-INF','DEP-GL'),
  ('E90002','Trabelsi', 'Amal',   'amal.trabelsi@esprit.tn',   'P','A','N','N','UP-INF','DEP-GL'),
  ('E90004','Gharbi',   'Sonia',  'sonia.gharbi@esprit.tn',    'P','A','N','N','UP-WEB','DEP-WEB'),
  ('E90005','Boussema', 'Yassine','yassine.boussema@esprit.tn','P','A','N','N','UP-WEB','DEP-WEB')
ON CONFLICT (id) DO UPDATE
  SET nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, mail=EXCLUDED.mail,
      up_id=EXCLUDED.up_id, dept_id=EXCLUDED.dept_id;

-- ==========================================================================
-- AFFECTATIONS (4 par enseignant)
-- ==========================================================================
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, commentaire)
SELECT e.id, s.id, niv, CURRENT_DATE, 'Affectation seed'
FROM (VALUES
  ('E90001','JAVA-ALGO-S1', 'N2_ELEMENTAIRE'),
  ('E90001','JAVA-BASE-S1', 'N3_INTERMEDIAIRE'),
  ('E90002','JAVA-SPRING-S1','N3_INTERMEDIAIRE'),
  ('E90002','JAVA-TEST-S1', 'N4_AVANCE'),
  ('E90004','WEB-FRONT-S1', 'N2_ELEMENTAIRE'),
  ('E90004','WEB-REACT-S1', 'N3_INTERMEDIAIRE'),
  ('E90005','WEB-FRONT-S4', 'N3_INTERMEDIAIRE'),
  ('E90005','WEB-API-S1',   'N3_INTERMEDIAIRE')
) AS v(eid, scode, niv)
JOIN enseignants e ON e.id = v.eid
JOIN savoirs     s ON s.code = v.scode
ON CONFLICT (enseignant_id, savoir_id) DO UPDATE
  SET niveau=EXCLUDED.niveau, date_acquisition=EXCLUDED.date_acquisition;

COMMIT;

-- ==========================================================================
-- VÉRIFICATION RAPIDE
-- ==========================================================================
SELECT label, n FROM (
  SELECT 1,'domaines créés',           COUNT(*)::bigint FROM domaines        WHERE code IN ('D2F-JAVA','D2F-WEB')
  UNION ALL
  SELECT 2,'savoirs Java (directs)',    COUNT(*) FROM savoirs WHERE code LIKE 'JAVA-%' AND competence_id IS NOT NULL AND sous_competence_id IS NULL
  UNION ALL
  SELECT 3,'savoirs Web (via SC)',      COUNT(*) FROM savoirs WHERE code LIKE 'WEB-%'  AND sous_competence_id IS NOT NULL AND competence_id IS NULL
  UNION ALL
  SELECT 4,'savoirs mal formés (0)',    COUNT(*) FROM savoirs WHERE (code LIKE 'JAVA-%' OR code LIKE 'WEB-%') AND competence_id IS NULL AND sous_competence_id IS NULL
  UNION ALL
  SELECT 5,'sous_competences Java (0)', COUNT(*) FROM sous_competences WHERE code LIKE 'JAVA-%'
  UNION ALL
  SELECT 6,'prérequis total',           COUNT(*) FROM competence_prerequisite cp JOIN competences c ON c.id=cp.competence_id WHERE c.code LIKE 'JAVA-%' OR c.code LIKE 'WEB-%'
  UNION ALL
  SELECT 7,'affectations créées',       COUNT(*) FROM enseignant_competences ec JOIN savoirs s ON s.id=ec.savoir_id WHERE s.code LIKE 'JAVA-%' OR s.code LIKE 'WEB-%'
) t(ord, label, n)
ORDER BY ord;
