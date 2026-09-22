-- V46 : rattache les formations Genie Civil de V45 aux savoirs du referentiel.
--
-- PROBLEME
-- --------
-- V45 a seede cinq formations GC (id 46 a 50) SANS aucune ligne dans
-- formation.formation_competences. Le moteur de recommandation ne pouvait
-- donc pas les justifier : il retombait sur un a priori de domaine (0.3) et
-- la page enseignant affichait, pour quatre recommandations sur cinq,
-- « Justification indisponible : aucun savoir du referentiel n'est rattache a
-- cette formation » avec une pertinence plafonnee a 41/100.
-- Mesure avant correctif : 42 formations sur 50 sans aucun lien savoir.
--
-- REGLE DE RATTACHEMENT (aucune invention)
-- ---------------------------------------
-- Chaque lien est DEDUIT du champ `competence` de la formation, qui enumere
-- explicitement son contenu, et rapproche du savoir dont le libelle porte le
-- meme intitule. Correspondances, verifiables ligne a ligne :
--
--   46 Geotechnique & Fondations       « Geologie, essais geotechniques,
--      (GC-TECH-S)                       fondations, risques sismique »
--      -> S1a Lire coupe geologique          (« Geologie »)
--      -> S2a Realiser essais geotechniques  (« essais geotechniques »)
--      -> S6  Dimensionner fondations        (« fondations »)
--      -> S5  Evaluer risque sismique        (« risques sismique »)
--
--   47 Physique du Batiment           « Thermique, acoustique, equipements
--      (GC-TECH-P)                      techniques du batiment »
--      -> P1b Modeliser comportement thermique          (« Thermique »)
--      -> P2  Diagnostiquer sante thermique et acoustique (« acoustique »)
--      -> P3  Dimensionner equipements techniques       (« equipements »)
--
--   48 Hydraulique & Gestion de l'Eau « Hydraulique, hydrologie, diagnostic
--      (GC-TECH-E)                      environnemental »
--      -> E1a Maitriser hydraulique              (« Hydraulique »)
--      -> E1b Modeliser hydrologie               (« hydrologie »)
--      -> E3  Realiser diagnostic environnemental (« diagnostic env. »)
--
--   49 Urbanisme & Amenagement        « Analyse urbaine, diagnostic
--      (GC-TECH-U)                      territorial, amenagement »
--      -> U1  Realiser analyse urbaine            (« Analyse urbaine »)
--      -> U2  Elaborer diagnostic urbain          (« diagnostic »)
--      -> U3a Concevoir projet d'amenagement urbain (« amenagement »)
--
--   50 Construction — Beton Arme      « Structure BA, ouvrages d art,
--      (GC-TECH-C)                      infrastructure routiere »
--      -> C1a Concevoir structure beton arme       (« Structure BA »)
--      -> C2a Concevoir ouvrage d'art              (« ouvrages d art »)
--      -> C3a Concevoir infrastructure routiere    (« infra. routiere »)
--
-- On reste sur un rattachement CIBLE (3 a 4 savoirs), conforme a la
-- convention des liens deja presents en base (formation 11 « BIM » : 3
-- savoirs ; formation 14 « reactjs » : 2). Lier en masse tous les savoirs
-- d'une competence gonflerait artificiellement la pertinence en pretendant
-- une couverture que le programme de la formation ne garantit pas.
--
-- LIMITE ASSUMEE : le niveau de couverture (partielle/totale) de chaque
-- savoir n'est pas renseigne, faute d'information dans le referentiel. Les
-- colonnes niveau_prerequis / niveau_vise restent donc nulles, et la
-- justification affichee reste « couvre partiellement ».
--
-- Idempotent : ON CONFLICT DO NOTHING + NOT EXISTS, rejouable sans doublon.
-- Resolution par CODE (jamais par id) : robuste au reseed du referentiel.

INSERT INTO formation.formation_competences (
    formation_id, domaine_id, competence_id, competence_nom,
    savoir_id, savoir_nom, savoir_type, created_at, created_by, version
)
SELECT
    m.formation_id,
    c.domaine_id,
    c.id,
    c.nom,
    s.id,
    s.nom,
    s.type,
    NOW(),
    'seed-v46',
    0
FROM (
    VALUES
      -- formation_id, code competence, code savoir
      (46, 'GC-TECH-S', 'S1a'),
      (46, 'GC-TECH-S', 'S2a'),
      (46, 'GC-TECH-S', 'S6'),
      (46, 'GC-TECH-S', 'S5'),
      (47, 'GC-TECH-P', 'P1b'),
      (47, 'GC-TECH-P', 'P2'),
      (47, 'GC-TECH-P', 'P3'),
      (48, 'GC-TECH-E', 'E1a'),
      (48, 'GC-TECH-E', 'E1b'),
      (48, 'GC-TECH-E', 'E3'),
      (49, 'GC-TECH-U', 'U1'),
      (49, 'GC-TECH-U', 'U2'),
      (49, 'GC-TECH-U', 'U3a'),
      (50, 'GC-TECH-C', 'C1a'),
      (50, 'GC-TECH-C', 'C2a'),
      (50, 'GC-TECH-C', 'C3a')
) AS m(formation_id, competence_code, savoir_code)
JOIN competence.competences c
  ON c.code = m.competence_code
JOIN competence.sous_competences sc
  ON sc.competence_id = c.id
JOIN competence.savoirs s
  ON s.sous_competence_id = sc.id
 AND s.code = m.savoir_code
-- La formation doit exister : si V45 n'a pas seede (base partielle), on
-- n'invente pas de ligne orpheline.
WHERE EXISTS (
    SELECT 1 FROM formation.formations f WHERE f.id_formation = m.formation_id
)
-- Idempotence : pas de second lien pour le meme couple (formation, savoir).
AND NOT EXISTS (
    SELECT 1 FROM formation.formation_competences fc
    WHERE fc.formation_id = m.formation_id
      AND fc.savoir_id = s.id
);
