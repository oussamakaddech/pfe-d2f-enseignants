# esprit_D2F-recommandation-formateur
## Système de Recommandation d'Enseignants par IA Sémantique

## 📋 Description

Ce projet est un système de recommandation intelligent qui utilise l'IA sémantique pour suggérer des enseignants appropriés en fonction des besoins de formation. L'application analyse les domaines, objectifs et objectifs pédagogiques pour fournir des recommandations personnalisées.

## 🚀 Fonctionnalités

- **Recommandation sémantique** : Utilise des embeddings pour trouver les enseignants les plus pertinents
- **API RESTful** : Interface FastAPI pour les recommandations
- **Cache intelligent** : Système de cache des embeddings avec rafraîchissement automatique
- **Planification des tâches** : Mise à jour hebdomadaire automatique des embeddings
- **CORS configuré** : Prêt pour l'intégration avec des applications frontend React

## 🛠️ Technologies Utilisées

- **Backend** : FastAPI, Uvicorn
- **Base de données** : PostgreSQL avec psycopg2
- **Embeddings** : Angle-Emb avec modèle UAE-Large-V1
- **Similarité** : FAISS-CPU, scikit-learn
- **Planification** : APScheduler
- **Cache** : Joblib

## 📦 Installation

### Prérequis

- Python 3.8+
- PostgreSQL
- Pip

### Installation des dépendances

```bash
pip install -r requirements.txt