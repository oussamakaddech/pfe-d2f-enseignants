# Service de Besoins de Formation - Spring Boot Microservice

## 📋 Description

Microservice Spring Boot dédié à la gestion complète du cycle des besoins de formation dans l'écosystème ESPRIT. Gestion des demandes de formation avec workflow d'approbation multi-niveaux, système de notifications et intégration ActiveMQ pour la publication d'événements.

## 🚀 Fonctionnalités Principales

### 📝 Gestion des Besoins de Formation
- **CRUD complet** : Création, consultation, modification, suppression des besoins
- **Workflow d'approbation** : Validation à 3 niveaux hiérarchiques
- **Statuts multiples** : Brouillon, En attente, Approuvé, Refusé
- **Données complètes** : Objectifs, prérequis, public cible, programme détaillé

### ✅ Système d'Approbation Multi-niveaux
- **CUP** : Première validation par le centre universitaire
- **Chef de Département** : Validation départementale
- **Administrateur** : Approbation finale
- **Commentaires** : Justification des décisions à chaque niveau

### 🔔 Système de Notifications
- **Notifications automatiques** : Alertes lors des changements de statut
- **Personnalisation** : Messages adaptés selon le type de décision
- **Historique** : Consultation des notifications par utilisateur
- **Notifications en temps réel** : Intégration WebSocket

### 📨 Architecture Événementielle
- **Publication JMS** : Événements pour les besoins approuvés via ActiveMQ
- **Prévention des doublons** : Flag pour éviter les répétitions
- **DTO spécialisé** :  pour le messaging
- **Intégration formation** : Déclenchement automatique de création de formation

## 🛠️ Stack Technique

### Backend
- **Spring Boot 3.4.2** avec Java 17
- **Spring Data JPA** : Persistance des besoins
- **PostgreSQL** : Base de données principale
- **Spring Web** : APIs REST complètes

### Messagerie & Événements
- **ActiveMQ Artemis** : Messaging asynchrone
- **Spring JMS** : Intégration Java Message Service
- **Événements métier** : Publication structurée des besoins approuvés

### Sécurité & Validation
- **Spring Validation** : Contrôle des données d'entrée
- **Gestion d'erreurs** : Exceptions métier personnalisées
- **DTO patterns** : Transfert de données sécurisé


