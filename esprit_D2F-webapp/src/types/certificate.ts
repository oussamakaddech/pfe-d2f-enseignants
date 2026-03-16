import type { Id } from "./common";

export interface Certificate {
  idCertificate?: Id;
  titreFormation?: string;
  typeCertif?: string;
  dateDebutFormation?: string;
  dateFinFormation?: string;
  nomEnseignant?: string;
  prenomEnseignant?: string;
  roleEnFormation?: string;
  pdfFile?: string;
}
