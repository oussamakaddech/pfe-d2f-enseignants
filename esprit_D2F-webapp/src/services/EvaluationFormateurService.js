import axios from "axios";
import { config } from "../config/env"; 
const EVALUATION_API_URL = `${config.EVALUATION_URL}/evaluation/evaluations`;

const EvaluationFormateurService = {

  async listEvaluationsEnrichedByFormation(formationId) {
    const response = await axios.get(
      `${EVALUATION_API_URL}/formation/${formationId}/enriched`
    );
    return response.data;
  },

  async updateEvaluationsBulkByFormation(formationId, evaluationsDtoList) {
    const response = await axios.post(
      `${EVALUATION_API_URL}/formation/${formationId}/bulk/update`,
      evaluationsDtoList
    );
    return response.data;
  },
};

export default EvaluationFormateurService;
