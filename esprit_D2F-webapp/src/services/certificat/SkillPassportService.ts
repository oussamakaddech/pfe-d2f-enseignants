import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

// ── Types TypeScript minimaux ────────────────────────────────────────────────

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

// ── Base URL versionnée conforme DSI (/api/v1/skill-passports → service-analyse) ──
const BASE_URL = `${config.GATEWAY_URL}/api/v1/skill-passports`;

// ── Utilitaire : téléchargement d'un Blob PDF ──────────────────────────────
function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ── Service principal ──────────────────────────────────────────────────────
const SkillPassportService = {
  /**
   * Télécharge le PDF du passeport de l'enseignant connecté.
   */
  async downloadMyPassport(): Promise<void> {
    const response = await axios.get(`${BASE_URL}/me`, {
      responseType: "blob",
    });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    downloadPdfBlob(response.data as Blob, `skill-passport-me-${today}.pdf`);
  },

  /**
   * Télécharge le PDF du passeport d'un enseignant cible (admin/CUP).
   */
  async downloadPassportByUsername(username: string): Promise<void> {
    const response = await axios.get(`${BASE_URL}/teacher/${username}`, {
      responseType: "blob",
    });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    downloadPdfBlob(response.data as Blob, `skill-passport-${username}-${today}.pdf`);
  },

  /**
   * Récupère les données JSON du passeport de l'enseignant connecté.
   */
  async getMyPassportData(): Promise<TeacherSkillPassportDTO> {
    const response = await axios.get<TeacherSkillPassportDTO>(`${BASE_URL}/me/json`);
    return response.data;
  },

  /**
   * Récupère les données JSON du passeport d'un enseignant cible.
   */
  async getPassportDataByUsername(username: string): Promise<TeacherSkillPassportDTO> {
    const response = await axios.get<TeacherSkillPassportDTO>(
      `${BASE_URL}/teacher/${username}/json`
    );
    return response.data;
  },
};

export default SkillPassportService;




