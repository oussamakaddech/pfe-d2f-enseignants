import { defaultApi as axios } from "@/utils/helpers/httpClient";
import type { AxiosResponse } from "axios";
import { config } from "@/config/env";
import type { Id } from "@/models/common";
import type { Formation } from "@/models/formation";

const API_URL = `${config.FORMATION_URL}/formation/formations-workflow`;

// Token is now in HttpOnly cookie, sent automatically via withCredentials: true.

type Presence = unknown;
type FormationWorkflowPayload = Record<string, unknown>;

const FormationWorkflowService = {
  async createFormationWorkflow(
    formationData: FormationWorkflowPayload
  ): Promise<Formation> {
    const response = await axios.post<Formation>(API_URL, formationData);
    return response.data;
  },

  async updateFormationWorkflow(
    id: Id,
    formationData: FormationWorkflowPayload
  ): Promise<Formation> {
    const response = await axios.put<Formation>(`${API_URL}/${id}`, formationData);
    return response.data;
  },

  async deleteFormationWorkflow(id: Id): Promise<unknown> {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async getFormationWorkflowById(id: Id): Promise<Formation> {
    const response = await axios.get<Formation>(`${API_URL}/${id}`);
    return response.data;
  },

  async getAllFormationWorkflows(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(API_URL);
    return response.data;
  },

  async updatePresence(
    id: Id,
    isPresent: boolean,
    commentaire?: string
  ): Promise<Presence> {
    const response = await axios.put<Presence>(`${API_URL}/presence/${id}`, null, {
      params: { present: isPresent, commentaire },
    });
    return response.data;
  },

  async getPresencesBySeance(seanceId: Id): Promise<Presence[]> {
    const response = await axios.get<Presence[]>(`${API_URL}/seances/${seanceId}/presences`);
    return response.data;
  },

  async batchUpdatePresences(
    seanceId: Id,
    updates: Array<{ idParticipation: number | string; present: boolean; commentaire?: string }>
  ): Promise<Presence[]> {
    const response = await axios.put<Presence[]>(
      `${API_URL}/seances/${seanceId}/presences/batch`,
      { updates }
    );
    return response.data;
  },

  async markAllPresences(seanceId: Id, present: boolean): Promise<Presence[]> {
    const response = await axios.put<Presence[]>(
      `${API_URL}/seances/${seanceId}/presences/mark-all`,
      null,
      { params: { present } }
    );
    return response.data;
  },

  async getSeancePresenceStats(seanceId: Id): Promise<{
    seanceId: number;
    total: number;
    presents: number;
    absents: number;
    tauxPresence: number;
  }> {
    const response = await axios.get(`${API_URL}/seances/${seanceId}/presences/stats`);
    return response.data as {
      seanceId: number;
      total: number;
      presents: number;
      absents: number;
      tauxPresence: number;
    };
  },

  async getFormationsByAnimateur(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/animateur`);
    return response.data;
  },

  async getFormationsAchevees(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/achevees`);
    return response.data;
  },

  async getAllFormationWithDocuments(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/with-documents`);
    return response.data;
  },

  // Backward-compatible alias used by some legacy pages.
  async getAllFormationsWithDocuments(): Promise<Formation[]> {
    return FormationWorkflowService.getAllFormationWithDocuments();
  },

  async getFormationsForCalendar(enseignantId: Id): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(
      `${API_URL}/enseignants/${enseignantId}/calendar`
    );
    return response.data;
  },

  async updateInscriptionsOuvertes(id: Id, ouvert: boolean): Promise<Formation> {
    const response = await axios.put<Formation>(
      `${API_URL}/${id}/inscriptionsOuvertes`,
      null,
      { params: { ouvert } }
    );
    return response.data;
  },

  async getFormationsVisibles(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/visibles`);
    return response.data;
  },

  async getFormationsParUp(upId: Id): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/par-up`, {
      params: { upId },
    });
    return response.data;
  },

  async exportFormations(
    start: string,
    end: string
  ): Promise<AxiosResponse<Blob>> {
    return axios.get<Blob>(`${API_URL}/export/excel`, {
      responseType: "blob",
      params: { start, end },
    });
  },
  async getFormationsParDepartement(deptId: Id): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/par-departement`, {
      params: { deptId },
    });
    return response.data;
  },
};

export default FormationWorkflowService;




