import type { Id } from "../common";

export interface FormationDocument {
  idDocument: Id;
  nomDocument?: string;
  pathType?: string;
  obligation?: boolean;
  originalFileName?: string;
  fileUrl?: string;
  fileType?: string;
  /** Chemin serveur du fichier (renvoyé par l'endpoint /with-documents). */
  filePath?: string;
  /** Date d'ajout du document (renvoyée par l'endpoint /with-documents). */
  date?: string;
}

export interface FormationWithDocuments {
  idFormation: Id;
  titreFormation?: string;
  documents?: FormationDocument[];
}
