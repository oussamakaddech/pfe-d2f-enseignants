# Service de Compétences - Spring Boot Microservice

## 📋 Description

Microservice Spring Boot dédié à la gestion des compétences dans l'écosystème ESPRIT. Gestion complète des compétences avec intégration des domaines, niveaux et savoirs via une architecture microservices et messagerie ActiveMQ.

## 🚀 Fonctionnalités Principales

### 🎯 Gestion des Compétences
- **CRUD complet** : Création, lecture, mise à jour, suppression des compétences
- **Gestion des affectations** : Liaison avec domaines, niveaux et savoirs
- **Recherche ** : Récupération par IDs 
- **DTOs enrichis** : Données complètes avec informations liées

### 🔗 Intégration Microservices
- **Domaine Service** : Récupération des informations de domaine
- **Niveau Service** : Association avec les niveaux de compétence
- **Savoir Service** : Gestion des savoirs associés aux compétences

### 📨 Messagerie ActiveMQ
- **Affectation asynchrone** : Liaison compétences-savoirs via JMS
- **Découplage** : Architecture événementielle pour la scalabilité
- **Messages structurés** : DTOs spécialisés pour les affectations

### 🔍 Requêtes Avancées
- **Compétences par IDs** : Récupération groupée par liste d'identifiants
- **Affectations complètes** : DTO avec toutes les relations
- **Savoirs par compétence** : Liste des savoirs associés

## 🛠️ Stack Technique

### Backend
- **Spring Boot 3.4.2** avec Java 17
- **Spring Data JPA** : Persistance des compétences
- **PostgreSQL** : Base de données principale
- **Spring Web** : APIs REST


### Messagerie
- **ActiveMQ/Artemis** : Messages asynchrones via JMS
- **JMS API** : Standard Java Message Service
- **Messages JSON** : Sérialisation des DTOs


