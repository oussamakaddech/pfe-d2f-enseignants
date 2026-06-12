-- ATTENTION : Ce hash est un placeholder. Générez un hash valide avant exécution.
-- Utilisez : java -cp your-app.jar org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
-- Ou générez via : htpasswd -nbBC 10 "" "VotreMotDePasse" | tr -d ':\n' | sed 's/$2y/$2a/'
-- Remplacez le hash ci-dessous par le hash généré.

-- Exemple de hash bcrypt pour le mot de passe "admin123" (À CHANGER EN PRODUCTION):
-- UPDATE users SET password = '$2a$10$PLACEHOLDER_HASH_HERE' WHERE username = 'admin';

-- NE PAS EXÉCUTER CE FICHIER SANS AVOIR REMPLACÉ LE HASH PAR UN HASH VALIDE
