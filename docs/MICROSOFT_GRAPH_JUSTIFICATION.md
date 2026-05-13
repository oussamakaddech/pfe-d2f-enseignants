# Justification — Microsoft Graph / Azure AD (DSI §3.2)

## Contexte

Le cahier des charges DSI §3.2 exige que toute dépendance à un service cloud externe soit documentée et justifiée.

La plateforme D2F utilise **Microsoft Graph API** et **Azure AD** uniquement pour l'envoi de courriels institutionnels via le compte Microsoft 365 de l'ESPRIT (`Application.Formationdesformateurs@Esprit.tn`).

## Justification

| Critère | Détail |
| :--- | :--- |
| **Infrastructure** | Microsoft 365 est l'abonnement institutionnel de l'ESPRIT — infrastructure interne, pas un service cloud tiers |
| **Données transmises** | Adresses e-mail des enseignants (déjà dans Active Directory ESPRIT) — aucune donnée pédagogique ou financière |
| **Usage** | Envoi de notifications et de resets de mot de passe uniquement |
| **Alternatif SMTP** | Le service est configurable via `MAIL_HOST` / `MAIL_USERNAME` pour basculer sur SMTP standard sans modifier le code |
| **Dépendance** | Non critique — si indisponible, seules les notifications par e-mail échouent ; le reste de la plateforme fonctionne |

## Configuration

Les credentials Azure AD sont stockés **exclusivement** dans le fichier `.env` (gitignore) et injectés comme variables d'environnement. Aucune valeur en dur dans le code source.

Variables concernées :
```
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
AZURE_AD_GRAPH_SCOPE=https://graph.microsoft.com/.default
AZURE_AD_MAIL_USERNAME=Application.Formationdesformateurs@Esprit.tn
```

## Conformité DSI

- **§1.1** : Aucune credential en dur — toutes externalisées dans `.env` ✓
- **§3.2** : Dépendance documentée et limitée à l'infrastructure institutionnelle ESPRIT ✓
- **Fallback SMTP** : Configurer `MAIL_HOST=smtp.office365.com` et `MAIL_USERNAME` / `MAIL_PASSWORD` pour contourner Graph si nécessaire ✓

## Responsable

Direction des Systèmes d'Information — ESPRIT (compte institutionnel Microsoft 365).
