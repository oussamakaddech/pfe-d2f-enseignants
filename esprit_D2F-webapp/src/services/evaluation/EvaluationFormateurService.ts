import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env"; 
import type { EvaluationEnriched, EvaluationFormateur } from "@/models/evaluation";
const EVALUATION_API_URL = `${config.EVALUATION_URL}/evaluation/evaluations`;

const EvaluationFormateurService = {
  async listEvaluationsEnrichedByFormation(formationId: number | string): Promise<EvaluationEnriched[]> {
    const response = await axios.get(
      `${EVALUATION_API_URL}/formation/${formationId}/enriched`
    );
    return response.data;
  },

  async updateEvaluationsBulkByFormation(formationId: number | string, evaluationsDtoList: Record<string, unknown>[]): Promise<EvaluationFormateur[]> {
    const response = await axios.post(
      `${EVALUATION_API_URL}/formation/${formationId}/bulk/update`,
      evaluationsDtoList
    );
    return response.data;
  },
};

export default EvaluationFormateurService;




