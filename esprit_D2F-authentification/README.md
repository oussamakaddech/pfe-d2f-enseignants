"# Service Auth"
# Service d'Authentification - Spring Boot Microservice

## 📋 Description

Microservice Spring Boot dédié à la gestion complète de l'authentification et de l'autorisation dans l'écosystème ESPRIT. Gestion des utilisateurs, rôles, JWT tokens, et récupération de mot de passe avec intégration email.

## 🚀 Fonctionnalités Principales

### 🔐 Authentification & Autorisation
- **Login sécurisé** : Authentification JWT avec Spring Security
- **Gestion des rôles** : RBAC (Role-Based Access Control) avec 4 rôles principaux
- **Tokens JWT** : Génération et validation avec signature HMAC
- **Sessions stateless** : Architecture sans état pour la scalabilité

### 👥 Gestion des Utilisateurs
- **Inscription** : Création de compte avec validation des données
- **Profils utilisateurs** : Édition des informations personnelles
- **Gestion des comptes** : Activation/désactivation par administrateur
- **Récupération mot de passe** : Système complet avec envoi d'email

### 📧 Intégration Email
- **Envoi de notifications** : Service email intégré
- **Récupération mot de passe** : Génération de clés de confirmation
- **Notifications administrateur** : Alertes pour réinitialisation d'appareils

### 🔒 Sécurité Avancée
- **BCrypt** : Hashage sécurisé des mots de passe
- **Validation JWT** : Middleware de sécurité pour toutes les APIs
- **CORS configuré** : Accès cross-origin contrôlé
- **Gestion des appareils** : Limitation et réinitialisation des devices

## 🛠️ Stack Technique

### Backend
- **Spring Boot 3.4.2** avec Java 17
- **Spring Security** : Authentification et autorisation
- **Spring Data JPA** : Persistance des données
- **PostgreSQL** 

### Sécurité
- **JWT Tokens** : Tokens signés avec HMAC-SHA512
- **OAuth2 Resource Server** : Configuration sécurité
- **BCryptPasswordEncoder** : Hashage des mots de passe
- **Validation** : Contrôles de données avec Bean Validation

### Communication

- **REST APIs** : Endpoints sécurisés



