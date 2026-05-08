# Configuration Sécurisée des Identifiants par Défaut

## Vue d'ensemble

Ce document explique comment configurer de manière sécurisée les identifiants par défaut pour l'administrateur du système D2F.

## Problème Résolu

Le problème de sécurité identifié par SonarQube (java:S6437) concernant le hardcoding des identifiants a été résolu en créant une classe utilitaire `DefaultCredentialsManager` qui lit les identifiants depuis la configuration au lieu de les avoir en dur dans le code.

## Architecture de la Solution

### 1. DefaultCredentialsManager

**Emplacement**: `esprit_D2F-authentification/src/main/java/esprit/pfe/auth/security/DefaultCredentialsManager.java`

Cette classe utilitaire:
- Lit les identifiants depuis la configuration Spring
- Valide que les identifiants par défaut ne sont pas utilisés en production
- Fournit des getters sécurisés pour accéder aux identifiants

### 2. Configuration par Défaut

**Emplacement**: `esprit_D2F-authentification/src/main/resources/application-security.properties`

Ce fichier contient les valeurs par défaut pour:
- Nom d'utilisateur
- Mot de passe
- Prénom
- Nom
- Numéro de téléphone
- Email

## Configuration

### Environnement de Développement

Pour le développement, utilisez les valeurs par défaut du fichier `application-security.properties`:

```properties
app.security.default-admin.username=admin
app.security.default-admin.password=CHANGE_ME_IN_PRODUCTION
app.security.default-admin.first-name=System
app.security.default-admin.last-name=Admin
app.security.default-admin.phone=00000000
app.security.default-admin.email=admin@d2f.local
```

### Environnement de Production

Pour la production, vous DEVEZ configurer des identifiants sécurisés. Il existe deux méthodes:

#### Méthode 1: Variables d'Environnement (Recommandée)

```bash
export SPRING_PROFILES_ACTIVE=prod
export APP_SECURITY_DEFAULT_ADMIN_USERNAME=your_secure_username
export APP_SECURITY_DEFAULT_ADMIN_PASSWORD=your_secure_password
export APP_SECURITY_DEFAULT_ADMIN_FIRST_NAME=Admin
export APP_SECURITY_DEFAULT_ADMIN_LAST_NAME=User
export APP_SECURITY_DEFAULT_ADMIN_PHONE=+1234567890
export APP_SECURITY_DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
```

#### Méthode 2: Fichier de Configuration Externe

Créez un fichier `application-prod.properties` avec des identifiants sécurisés:

```properties
# Identifiants sécurisés pour la production
app.security.default-admin.username=your_secure_username
app.security.default-admin.password=your_secure_password
app.security.default-admin.first-name=Admin
app.security.default-admin.last-name=User
app.security.default-admin.phone=+1234567890
app.security.default-admin.email=admin@yourdomain.com
```

**IMPORTANT**: Assurez-vous que ce fichier:
- N'est pas commité dans le repository
- A des permissions restrictives (chmod 600)
- Est stocké dans un endroit sécurisé
- Est inclus dans les fichiers .gitignore

## Validation de la Configuration

Le système valide automatiquement que:
- Les identifiants par défaut ne sont pas utilisés en production
- Le mot de passe par défaut "CHANGE_ME_IN_PRODUCTION" déclenche une erreur en production

Si une configuration invalide est détectée, le système lancera une exception au démarrage:

```
IllegalStateException: Les identifiants par défaut doivent être configurés en production. 
Veuillez définir les propriétés app.security.default-admin.* dans votre configuration.
```

## Sécurité Additionnelle

### 1. Rotation des Identifiants

Il est recommandé de:
- Changer régulièrement le mot de passe de l'administrateur
- Utiliser un générateur de mots de passe sécurisé
- Stocker les identifiants dans un gestionnaire de secrets (ex: HashiCorp Vault)

### 2. Audit des Connexions

Le système enregistre automatiquement:
- Les tentatives de connexion réussies
- Les échecs de connexion
- Les changements de mot de passe

### 3. Politique de Mot de Passe

Pour une sécurité maximale, le mot de passe de l'administrateur doit:
- Avoir au moins 12 caractères
- Contenir des majuscules, minuscules, chiffres et caractères spéciaux
- Être unique et non utilisé ailleurs
- Être changé régulièrement

## Dépannage

### Erreur: "Les identifiants par défaut doivent être configurés en production"

**Cause**: Vous essayez de démarrer en production avec les identifiants par défaut.

**Solution**: Configurez des identifiants sécurisés via variables d'environnement ou fichier de configuration externe.

### Erreur: "Authentication failed"

**Cause**: Le mot de passe configuré ne correspond pas à celui stocké dans la base de données.

**Solution**: 
1. Vérifiez que la configuration est correcte
2. Si nécessaire, réinitialisez le mot de passe dans la base de données
3. Redémarrez l'application

## Bonnes Pratiques

1. **Jamais de hardcoding**: Ne jamais mettre d'identifiants en dur dans le code
2. **Séparation des environnements**: Utiliser des configurations différentes pour dev/test/prod
3. **Rotation régulière**: Changer les identifiants périodiquement
4. **Stockage sécurisé**: Utiliser des gestionnaires de secrets pour la production
5. **Audit**: Surveiller les activités du compte administrateur
6. **Documentation**: Maintenir ce document à jour avec toute modification

## Références

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [SonarQube Rule S6437](https://rules.sonarsource.com/java/RSPEC-6437)
