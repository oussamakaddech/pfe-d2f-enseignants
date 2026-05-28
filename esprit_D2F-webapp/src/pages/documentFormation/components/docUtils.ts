export const normalizeText = (value: unknown): string =>
  String(value ?? "").toLowerCase();

export const formatFileSize = (value: unknown): string => {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "Taille inconnue";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
};

export const formatDate = (value: unknown): string => {
  if (!value) return "Date inconnue";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(String(value)));
  } catch {
    return String(value).split("T")[0];
  }
};

export interface OneDriveNode {
  id: string;
  name: string;
  folder?: unknown;
  fileSize?: number;
  downloadUrl?: string;
  children?: OneDriveNode[];
}

export interface SelectedFile {
  name: string;
  fileSize?: number;
  downloadUrl: string;
  rawUrl: string;
}

import type { FormationDocument } from "@/models/document";

export interface Formation {
  idFormation: number | string;
  titreFormation?: string;
  dateDebut?: string;
  up1?: { libelle?: string };
  departement1?: { libelle?: string };
  documents?: FormationDocument[];
  inscriptionsOuvertes?: boolean;
}
