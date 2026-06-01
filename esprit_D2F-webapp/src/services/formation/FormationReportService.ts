import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
const API_URL = `${config.FORMATION_URL}/formation/formation-report`;

function formatDate(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  return date;
}

const FormationReportService = {
  async getFormationsParRoleEtPeriode(
    role: string,
    enseignantId: string,
    start: Date | string,
    end: Date | string
  ) {
    const params = {
      role,
      enseignantId,
      start: formatDate(start),
      end: formatDate(end),
    };
    const response = await axios.get(API_URL, { params });
    return response.data;
  }
};

export default FormationReportService;
