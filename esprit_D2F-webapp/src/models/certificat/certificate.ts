import type { Id } from '../common';

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




