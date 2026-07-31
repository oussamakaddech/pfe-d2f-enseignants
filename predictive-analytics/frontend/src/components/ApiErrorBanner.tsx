import { Alert } from "antd";
import { ApiClientError } from "../api/client";

const FRIENDLY: Record<string, { title: string; description: string }> = {
  LEGACY_ID_NOT_ALLOWED: {
    title: "Identifiant legacy rejeté",
    description:
      "Cet identifiant (Txxx ou Exxxxx) n'est pas accepté. Utilisez le format canonique ENSxxx.",
  },
  TEACHER_NOT_FOUND: {
    title: "Enseignant introuvable",
    description: "Aucun profil ne correspond à cet identifiant dans le référentiel.",
  },
  INVALID_TEACHER_ID: {
    title: "Identifiant invalide",
    description: "Le format attendu est ENSxxx (ex. ENS001).",
  },
  INSUFFICIENT_HISTORICAL_DATA: {
    title: "Historique insuffisant",
    description:
      "Pas assez de données historiques pour produire une prédiction fiable pour cet enseignant.",
  },
  MODEL_UNAVAILABLE: {
    title: "Modèle indisponible",
    description: "Le modèle ML n'a pas encore été entraîné ou exporté.",
  },
  HTTP_ERROR: {
    title: "Erreur serveur",
    description: "La requête a échoué. Vérifiez que l'API est démarrée.",
  },
  FORBIDDEN: {
    title: "Accès refusé",
    description: "Votre rôle ne permet pas d'accéder à cette ressource.",
  },
  UNAUTHORIZED: {
    title: "Non authentifié",
    description: "Le rôle utilisateur est manquant (header X-User-Role).",
  },
};

interface Props {
  error: unknown;
}

export function ApiErrorBanner({ error }: Props) {
  if (!(error instanceof ApiClientError)) {
    return (
      <Alert
        type="error"
        showIcon
        message="Erreur inattendue"
        description={String(error ?? "Une erreur est survenue.")}
      />
    );
  }

  const friendly = FRIENDLY[error.code] ?? {
    title: error.code,
    description: error.message,
  };

  return (
    <Alert
      type={error.status >= 500 ? "error" : "warning"}
      showIcon
      message={friendly.title}
      description={friendly.description}
    />
  );
}
