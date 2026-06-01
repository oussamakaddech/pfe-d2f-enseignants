export const HEADER_HEIGHT = 64;

export const ROUTE_LABELS: Record<string, string> = {
  home:                   "Accueil",
  Formation:              "Formations",
  Creer:                  "Nouvelle formation",
  Consulter:              "Catalogue",
  accounts:               "Gestion des comptes",
  Enseignants:            "Enseignants",
  enseignant:             "Enseignant",
  KPI:                    "KPI & Métriques",
  AnalysePredictive:      "Analyse prédictive",
  analytics:              "Analytique",
  dashboard:              "Tableau de bord",
  teacher:                "Enseignant",
  alerts:                 "Alertes",
  competences:            "Compétences",
  competence:             "Compétences",
  besoins:                "Besoins en formation",
  ajouter:                "Ajouter",
  Evaluations:            "Évaluations",
  profile:                "Mon profil",
  "edit-profile":         "Modifier le profil",
  "update-password":      "Mot de passe",
  certificate:            "Certifications",
  Calendrier:             "Calendrier",
  calendar:               "Calendrier",
  "animateur-formations": "Sessions d'animation",
  affectations:           "Affectations",
  rice:                   "RICE",
  matchmaking:            "Matchmaking IA",
  "competence-matching":  "Correspondance",
  File:                   "Gestion documentaire",
  UpDept:                 "Structures",
  ListeFormation:         "Inscriptions",
  MyCertificate:          "Mes certificats",
  register:               "Inscription",
  test:                   "Tests",
  "skill-passport":       "Skill Passport",
};

export function getBackTarget(currentPath: string): string {
  if (currentPath.startsWith("/home/competences/enseignant/")) return "/home/competences";
  if (currentPath.startsWith("/home/rice/matchmaking") ||
      currentPath.startsWith("/home/rice/competence-matching"))  return "/home/rice";
  if (currentPath.startsWith("/home/affectations"))              return "/home/competences";
  if (["/home/profile", "/home/edit-profile", "/home/update-password",
       "/home/skill-passport"].includes(currentPath))            return "/home";
  return "/home";
}
