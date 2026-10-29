-- V25 : le champ « code » du referentiel n'a plus de limite de caracteres.
--
-- Contexte : les formulaires d'ajout / modification (domaine, competence,
-- sous-competence, savoir) refusaient un code de plus de 20 ou 100 caracteres
-- (@Size(max = 20) cote API, maxLength / validateur cote IHM). Ces limites sont
-- retirees ; la colonne doit donc accepter un code de n'importe quelle longueur.
--
-- Les 4 colonnes etaient en varchar(255). On passe a varchar SANS longueur
-- (texte de longueur illimitee en PostgreSQL) plutot qu'a `text` : le type reste
-- VARCHAR, ce que Hibernate accepte avec ddl-auto=validate (le controle porte sur
-- le code de type JDBC, pas sur la taille). L'unicite et l'index existants sont
-- conserves.
--
-- Remarque : le format reste contraint applicativement (majuscules, chiffres et
-- « _ »), seule la LONGUEUR est libre.
--
-- Idempotent : ALTER COLUMN ... TYPE VARCHAR sur une colonne deja sans longueur
-- ne change rien (PostgreSQL laisse la colonne telle quelle).
--
-- Retour arriere (echec si un code depasse alors 255 caracteres) :
--   ALTER TABLE competence.domaines         ALTER COLUMN code TYPE VARCHAR(255);
--   ALTER TABLE competence.competences      ALTER COLUMN code TYPE VARCHAR(255);
--   ALTER TABLE competence.sous_competences ALTER COLUMN code TYPE VARCHAR(255);
--   ALTER TABLE competence.savoirs          ALTER COLUMN code TYPE VARCHAR(255);

ALTER TABLE competence.domaines         ALTER COLUMN code TYPE VARCHAR;
ALTER TABLE competence.competences      ALTER COLUMN code TYPE VARCHAR;
ALTER TABLE competence.sous_competences ALTER COLUMN code TYPE VARCHAR;
ALTER TABLE competence.savoirs          ALTER COLUMN code TYPE VARCHAR;
