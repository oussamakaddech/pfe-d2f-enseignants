-- =============================================================================
-- V21__rotate_seeded_passwords.sql
-- Correctif de sécurité (audit DSI §1.1) : les migrations V6/V14/V17
-- contenaient des mots de passe en clair dans le dépôt git (admin / D2F@2025).
-- Ces fichiers historiques restent intacts pour préserver les checksums Flyway ;
-- cette migration force la ROTATION du mot de passe de tous les comptes seedés.
--
-- Comportement du placeholder ${d2fSeedPassword} (env D2F_SEED_PASSWORD) :
--   - renseigné  -> bcrypt de la valeur fournie (dev/QA uniquement) ;
--   - vide (prod) -> mot de passe aléatoire inutilisable posé en base :
--                    les comptes démo deviennent inaccessibles par mot de passe.
--
-- NB : le compte 'admin' est re-synchronisé à chaque boot par DataSeederConfig
-- avec APP_SECURITY_DEFAULT_ADMIN_PASSWORD (mot de passe fort obligatoire en
-- prod, cf. DefaultCredentialsManager).
-- =============================================================================

UPDATE users
SET password = crypt(
    CASE
        WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
        ELSE '${d2fSeedPassword}'
    END,
    gen_salt('bf', 10)
)
WHERE username IN (
    'admin',
    'E00006',
    'fbenhassen',
    'ktrabelsi',
    'smansouri',
    'agharbi',
    'mhamdi',
    'lbensalem',
    'jdupont'
);
