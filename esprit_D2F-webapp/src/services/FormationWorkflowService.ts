import { defaultApi as axios } from "../utils/httpClient";
import type { AxiosResponse } from "axios";
import { config } from "../config/env";
import type { Id } from "../models/common";
import type { Formation } from "../models/formation";

const API_URL = `${config.FORMATION_URL}/formation/formations-workflow`;

function getToken(): string | null {
  return localStorage.getItem("authToken");
}

function requireToken(): string {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication token is missing.");
  }
  return token;
}

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

  async getFormationsByAnimateur(): Promise<Formation[]> {
    const token = requireToken();
    const response = await axios.get<Formation[]>(`${API_URL}/animateur`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
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
    const token = requireToken();
    const response = await axios.get<Formation[]>(
      `${API_URL}/enseignants/${enseignantId}/calendar`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
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
};

export default FormationWorkflowService;
