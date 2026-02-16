"# Service Evaluation" 
# Service d'Évaluation - Spring Boot Microservice

## 📋 Description

Microservice Spring Boot dédié à la gestion des évaluations des formateurs dans l'écosystème ESPRIT. Gestion complète des évaluations avec intégration ActiveMQ pour le traitement asynchrone et communication avec le service de formation.

## 🚀 Fonctionnalités Principales

### 📝 Gestion des Évaluations
- **CRUD complet** : Création, lecture, mise à jour, suppression des évaluations
- **Évaluations par lot** : Traitement batch via ActiveMQ
- **Validation automatique** : Seuils de compétence automatiques
- **Évaluations enrichies** : Données combinées avec les services enseignants et formations

### 🔄 Intégration ActiveMQ
- **Création en masse** : Traitement asynchrone des nouvelles évaluations
- **Mise à jour en masse** : Synchronisation batch des modifications
- **Découplage** : Architecture événementielle pour une meilleure scalabilité

### 📊 Données Enrichies
- **Informations enseignants** : Nom, prénom, email, département, UP
- **Informations formations** : Titre, dates, état, charge horaire
- **Statistiques** : Notes moyennes, taux de satisfaction

## 🛠️ Stack Technique

### Backend
- **Spring Boot 3.4.2** avec Java 17
- **Spring Data JPA** : Persistance des données
- **PostgreSQL** + H2 (développement)
- **Spring Security** + OAuth2

### Messagerie
- **ActiveMQ** : Messages asynchrones via JMS
- **Jackson** : Sérialisation JSON des messages

### Intégrations
- **Swagger** : Documentation API automatique
