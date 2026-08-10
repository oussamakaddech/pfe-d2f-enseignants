import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';

/**
 * Service de tests A/B pour le moteur d'analyse prédictive.
 *
 * Le routeur FastAPI `app/routers/ab_testing.py` est monté sous le préfixe
 * `/api/v1/analytics/ab` (côté service). Via le gateway, le chemin exposé est
 * `/api/analyse/v1/analytics/ab/**` ; `config.ANALYSE_URL` contient déjà le
 * préfixe `/api/analyse`, d'où la base ci-dessous.
 */
const AB_API = `${config.ANALYSE_URL}/analyse/v1/analytics/ab`;

export interface ABAssignRequest {
  teacher_id: string;
  experiment_name?: string;
}

export interface ABAssignResponse {
  teacher_id: string;
  experiment_name: string;
  variant: string;
}

export interface ABEventRequest {
  teacher_id: string;
  experiment_name?: string;
  variant: string;
  event_type: string;
  formation_id?: number | null;
  value?: number;
  metadata_json?: Record<string, unknown> | null;
}

export interface ABVariantResult {
  variant: string;
  sample_size: number;
  shown: number;
  accepted: number;
  completed: number;
  acceptance_rate: number;
  completion_rate: number;
  avg_score: number;
  avg_days_to_enroll: number;
}

export type ABResultsResponse = ABVariantResult[];

export interface ABWinnerResponse {
  variant?: string;
  score?: number;
  reason?: string;
  [key: string]: unknown;
}

const ABTestingService = {
  /** Assigne (déterministe) un enseignant à une variante pour une expérience. */
  async assign(req: ABAssignRequest): Promise<ABAssignResponse> {
    const res = await axios.post<ABAssignResponse>(`${AB_API}/assign`, req);
    return res.data;
  },

  /** Enregistre un événement (shown, accepted, completed, scored, days_to_enroll). */
  async recordEvent(req: ABEventRequest): Promise<{ status: string }> {
    const res = await axios.post<{ status: string }>(`${AB_API}/event`, req);
    return res.data;
  },

  /** Récupère les résultats agrégés (liste par variante) d'une expérience. */
  async getResults(experiment: string): Promise<ABResultsResponse> {
    const res = await axios.get<ABResultsResponse>(
      `${AB_API}/results/${encodeURIComponent(experiment)}`,
    );
    return res.data;
  },

  /** Détermine la variante gagnante d'une expérience (peut lever 404). */
  async getWinner(experiment: string): Promise<ABWinnerResponse> {
    const res = await axios.get<ABWinnerResponse>(
      `${AB_API}/winner/${encodeURIComponent(experiment)}`,
    );
    return res.data;
  },
};

export default ABTestingService;
