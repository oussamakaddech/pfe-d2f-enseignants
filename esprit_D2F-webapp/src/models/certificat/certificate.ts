import type { Id } from '../common';

/** Statuts de certificat connus (le backend peut en exposer d'autres). */
export type CertificateStatus = 'ISSUED' | 'REVOKED' | (string & {});

/**
 * Certificat — aligné sur le DTO backend CertificateResponse
 * (service-certificat). Champs de cycle de vie : statut ISSUED/REVOKED,
 * révocation (motif, auteur, date) et vérification publique.
 */
export interface Certificate {
  idCertificate?: Id;
  certificateNumber?: string;
  verificationToken?: string;
  verificationHash?: string;
  issuedAt?: string;
  certificateStatus?: CertificateStatus;
  formationId?: Id;
  titreFormation?: string;
  typeCertif?: string;
  dateDebutFormation?: string;
  dateFinFormation?: string;
  chargeHoraireGlobal?: number;
  enseignantId?: string;
  nomEnseignant?: string;
  prenomEnseignant?: string;
  mailEnseignant?: string;
  deptEnseignant?: string;
  roleEnFormation?: string;
  delivered?: boolean;
  pdfFile?: string;
  pdfFilePath?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

/** Réponse de GET /certificates/verify/{certificateNumber} (page publique). */
export interface CertificateVerification {
  certificateNumber: string;
  nomEnseignant?: string;
  prenomEnseignant?: string;
  titreFormation?: string;
  chargeHoraireGlobal?: number;
  dateDebutFormation?: string;
  dateFinFormation?: string;
  issuedAt?: string;
  certificateStatus?: string;
  competencesValidees?: string;
}

/** Indicateurs de certification (étape 7) — GET /certificates/indicators. */
export interface CertificateIndicators {
  eligibleCount: number;
  deliveredCount: number;
  pendingCount: number;
  revokedCount: number;
}

/** Demande de révocation — PUT /certificates/{id}/revoke (motif obligatoire). */
export interface CertificateRevocationPayload {
  reason: string;
}

export interface TeacherIdentityDTO {
  enseignantId: string;
  username: string;
  prenom: string;
  nom: string;
  email: string;
  role?: string;
  telephone?: string;
}

export interface SavoirSummaryDTO {
  savoirId?: number;
  code: string;
  nom: string;
  type: string;
  niveau: string;
  niveauLabel: string;
  niveauNumeric: number;
  dateAcquisition?: string;
}

export interface CompetenceSummaryDTO {
  competenceId?: number;
  nom: string;
  sousCompetenceNom?: string;
  niveauMoyen: number;
  savoirs: SavoirSummaryDTO[];
}

export interface DomainSummaryDTO {
  domaineId?: number;
  nom: string;
  scoreGlobal: number;
  totalSavoirs: number;
  competences: CompetenceSummaryDTO[];
}

export interface TrainingHistoryDTO {
  formationId: string;
  titre: string;
  dateDebut?: string;
  dateFin?: string;
  duree?: string;
  statut?: string;
  competencesCiblees?: string[];
}

export interface CertificationSummaryDTO {
  certificatId?: number;
  titreFormation: string;
  typeCertif: string;
  dateObtention?: string;
}

export interface SkillGapSummaryDTO {
  competenceCode: string;
  competenceLabel: string;
  niveauActuel: number;
  niveauCible: number;
  gap: number;
  gravite: string;
  explication?: string;
}

export interface RecommendationSummaryDTO {
  formationId: string;
  titre: string;
  duree?: string;
  competencesCiblees?: string[];
  probabiliteReussite: number;
  priorite: string;
  justification?: string;
}

export interface TeacherSkillPassportDTO {
  identity: TeacherIdentityDTO;
  dateGeneration: string;
  scoreGlobal: number;
  statut: string;
  totalSavoirsMaitrises: number;
  totalFormations: number;
  totalCertifications: number;
  totalGaps: number;
  domaines: DomainSummaryDTO[];
  formations: TrainingHistoryDTO[];
  certifications: CertificationSummaryDTO[];
  gaps: SkillGapSummaryDTO[];
  recommandations: RecommendationSummaryDTO[];
}
