"# API Gateway" 
# API Gateway - Spring Cloud Gateway

## 📋 Description

Gateway centralisée Spring Cloud pour l'écosystème ESPRIT, servant de point d'entrée unique pour tous les microservices. Gestion du routage, équilibrage de charge, CORS et service discovery intégré.

## 🚀 Fonctionnalités Principales

### 🌐 Routage Intelligent
- **Routage dynamique** : Redirection vers les microservices appropriés
- **Service discovery** : Intégration avec Eureka pour le routage automatique
- **Load balancing** : Distribution de charge avec Ribbon
- **Prédicats avancés** : Routage basé sur le chemin, méthode, headers

### 🔒 Gestion des Accès
- **Point d'entrée unique** : Sécurisation centralisée des APIs
- **Configuration CORS** : Gestion cross-origin pour les applications frontend
- **StripPrefix** : Nettoyage des chemins pour les microservices
- **Filtres Gateway** : Pipeline de traitement des requêtes

### 📡 Intégration Microservices
- **7 services managés** : Routage vers tous les microservices ESPRIT
- **Architecture résiliente** : Découplage client-service
- **Monitoring intégré** : Endpoints Actuator pour la supervision
- **Évolutivité** : Ajout facile de nouveaux services

## 🛠️ Stack Technique

### Gateway & Routing
- **Spring Cloud Gateway 4.0+** : Gateway réactive et performante
- **Spring Cloud Netflix Eureka** : Service discovery
- **Load Balancer** : Équilibrage de charge client-side
- **Actuator** : Monitoring et métriques

### Configuration
- **YAML/Properties** : Configuration externalisée
- **Routes dynamiques** : Définition déclarative des routes
- **CORS global** : Configuration cross-origin centralisée

## 🎯 Services Routés

| Service | Chemin Gateway | Service ID | Port Destination |
|---------|----------------|------------|------------------|
| Authentification | `/auth/**` | `AUTH-SERVICE` | 8081 |
| Certificats | `/certificat/**` | `CERTIFICAT-SERVICE` | 8083 |
| Évaluations | `/evaluation/**` | `EVALUATION-SERVICE` | 8082 |
| Formations | `/formation/**` | `FORMATION-SERVICE` | 8080 |
| IA Recommandation | `/ai/**` | `AI-RECO-SERVICE` | 8000 |
| Besoins Formation | `/besoinsformation/**` | `BESOINSFORMATION-SERVICE` | 8085 |

## ⚙️ Configuration

### Application Properties
```properties
# Server
server.port=8080

# Application
spring.application.name=service-gateway

# Gateway Discovery
spring.cloud.gateway.discovery.locator.enabled=true
