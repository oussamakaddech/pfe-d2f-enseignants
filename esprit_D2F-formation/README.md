
# Service de Formation - Spring Boot Microservice

## 📋 Description

Microservice Spring Boot pour la gestion complète du cycle de formation au sein de l'écosystème ESPRIT. Gestion des formations, enseignants, inscriptions, avec intégration Microsoft 365 et système de messagerie ActiveMQ.

## 🚀 Fonctionnalités Principales

### 🎯 Gestion des Formations
- **Workflow complet** : Création, modification, suppression
- **Gestion des séances** : Planification avec vérification des conflits
- **Inscriptions** : Système de demande et validation
- **Documents associés** : Gestion avec stockage OneDrive
- **Certificats** : Génération automatique via ActiveMQ

### 👨‍🏫 Gestion des Enseignants
- **CRUD complet** et import Excel
- **Rôles multiples** : Animateur, Participant avec gestion des présences
- **Statistiques** et KPIs par enseignant

### 📊 Tableaux de Bord et KPIs
- **Indicateurs de performance** : Formations, heures, participants
- **Statistiques avancées** : Taux de participation, absences
- **Export Excel** des rapports détaillés

### 🔗 Intégrations Microsoft 365
- **OneDrive** : Stockage sécurisé des documents
- **Outlook Calendar** : Synchronisation des séances
- **Outlook Mail** : Notifications et confirmations

### 📨 Messagerie ActiveMQ
- **Génération de certificats** : Messages asynchrones
- **Évaluations** : Traitement par lots
- **Événements métier** : Approbation des besoins de formation

## 🛠️ Stack Technique

### Backend
- **Spring Boot 3.4.2** avec Java 17
- **PostgreSQL** + H2 (dev)
- **Spring Data JPA**
- **Spring Security** + OAuth2

### Messagerie
- **ActiveMQ** : Messages asynchrones
- **JMS** : Java Message Service
- **Jackson** : Sérialisation JSON

### Intégrations
- **Microsoft Graph** : API Microsoft 365
- **Feign Client** : Communication inter-microservices
- **Apache POI** : Fichiers Excel
- **Swagger** : Documentation API


