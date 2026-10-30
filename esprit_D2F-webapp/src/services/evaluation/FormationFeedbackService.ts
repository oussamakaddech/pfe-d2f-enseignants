import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';

const API_URL = `${config.EVALUATION_URL}/evaluation/formation-feedback`;
const FORMATION_URL = `${config.FORMATION_URL}/formation/formations-workflow`;

/** Échelle du questionnaire (index + 1 = note envoyée). */
export const NIVEAUX_SATISFACTION = [
  'Pas du tout satisfaisant',
  'Pas satisfaisant',
  'Moyennement satisfaisant',
  'Satisfaisant',
  'Très satisfaisant',
] as const;

export const ASPECTS = [
  { key: 'aspectOrganisationnel', stat: 'organisationnel', label: 'Aspect organisationnel' },
  { key: 'aspectTechnique', stat: 'technique', label: 'Aspect technique' },
  { key: 'aspectPedagogique', stat: 'pedagogique', label: 'Aspect pédagogique' },
] as const;

export interface FormationAEvaluer {
  idFormation: number;
  titreFormation: string;
  dateDebut?: string;
  dateFin?: string;
  etatFormation?: string;
}

export interface FormationFeedbackPayload {
  formationId: number;
  aspectOrganisationnel: number;
  aspectTechnique: number;
  aspectPedagogique: number;
  besoinComplementaire: boolean;
  autresInformations?: string;
  autresBesoins?: string;
}

export interface FeedbackStats {
  totalReponses: number;
  aspects: Record<string, { repartition: number[]; moyenne: number | null }>;
  besoinComplementaire: { oui: number; non: number };
  parFormation: { formationId: number; reponses: number; moyenne: number | null }[];
  parUp: Record<string, number>;
  commentaires: {
    formationId: number;
    date?: string;
    autresInformations?: string | null;
    autresBesoins?: string | null;
  }[];
}

/** Réponse individuelle anonyme (export Excel ADMIN). */
export interface FeedbackReponse {
  id: number;
  date?: string;
  formationId: number;
  up?: string | null;
  aspectOrganisationnel?: number | null;
  aspectTechnique?: number | null;
  aspectPedagogique?: number | null;
  besoinComplementaire?: boolean | null;
  autresInformations?: string | null;
  autresBesoins?: string | null;
}

const FormationFeedbackService = {
  async getFormationsAEvaluer(): Promise<FormationAEvaluer[]> {
    const response = await axios.get(`${FORMATION_URL}/mes-formations-a-evaluer`);
    return Array.isArray(response.data) ? response.data : [];
  },

  async getMesFormationsEvaluees(): Promise<number[]> {
    const response = await axios.get(`${API_URL}/mine`);
    return Array.isArray(response.data) ? response.data : [];
  },

  async submit(payload: FormationFeedbackPayload): Promise<void> {
    await axios.post(API_URL, payload);
  },

  async getReponses(formationId?: number): Promise<FeedbackReponse[]> {
    const response = await axios.get(`${API_URL}/reponses`, {
      params: formationId ? { formationId } : undefined,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async getStats(formationId?: number): Promise<FeedbackStats> {
    const response = await axios.get(`${API_URL}/stats`, {
      params: formationId ? { formationId } : undefined,
    });
    return response.data;
  },
};

export default FormationFeedbackService;
