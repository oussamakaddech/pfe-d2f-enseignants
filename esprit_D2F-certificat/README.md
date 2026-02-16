"# Service Certificat"
# Service de Certificats - Spring Boot Microservice

## 📋 Description

Microservice Spring Boot dédié à la génération et gestion des certificats de formation dans l'écosystème ESPRIT. Génération automatique de certificats PDF via ActiveMQ avec intégration iText pour la création de documents professionnels.

## 🚀 Fonctionnalités Principales

### 📄 Génération de Certificats
- **Génération automatique** : Déclenchement via messages ActiveMQ
- **Certificats PDF** : Création avec iText 7 et mise en forme avancée
- **Arrière-plan personnalisable** : Support d'images de fond
- **Données dynamiques** : Informations formation et enseignant personnalisées

### 🔄 Intégration ActiveMQ
- **Traitement asynchrone** : Réception des demandes de génération
- **Messages batch** : Traitement groupé pour une formation complète
- **Découplage** : Architecture événementielle avec le service formation

### 📊 Gestion des Certificats
- **CRUD complet** : Création, consultation, mise à jour des certificats
- **Statut de livraison** : Suivi de la délivrance aux enseignants
- **Recherche multi-critères** : Par formation, enseignant, email

### 🎨 Personnalisation
- **Modèles de certificats** : Structure professionnelle avec logo ESPRIT
- **Champs dynamiques** : Titre formation, dates, charge horaire, informations enseignant


## 🛠️ Stack Technique

### Backend
- **Spring Boot 3.4.2** avec Java 17
- **Spring Data JPA** : Persistance des certificats
- **PostgreSQL** + H2 (développement)
- **Spring Security** + OAuth2 JWT

### Messagerie
- **ActiveMQ** : Réception asynchrone des demandes
- **JMS** : Java Message Service avec sérialisation JSON
- **Jackson** : Conversion des messages

### Sécurité
- **OAuth2 Resource Server** : Validation JWT
- **Config CORS** : Accès cross-origin contrôlé
- **Authentification par email** : Récupération des certificats par utilisateur


