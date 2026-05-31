import { defaultApi as axios } from "@/utils/helpers/httpClient";
import type { AxiosResponse } from "axios";
import { config } from "@/config/env";
import type { Id } from "@/models/common";
import type { Formation } from "@/models/formation";
import type { Presence, PresenceStats } from "@/models/presence";

const API_URL = `${config.FORMATION_URL}/formation/formations-workflow`;

// Token is now in HttpOnly cookie, sent automatically via withCredentials: true.

type FormationWorkflowPayload = Record<string, unknown>;

function normalizeListResponse(payload: unknown): Formation[] {
  if (Array.isArray(payload)) {
    return payload as Formation[];
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as {
      content?: unknown;
      data?: unknown;
      items?: unknown;
    };

    if (Array.isArray(candidate.content)) {
      return candidate.content as Formation[];
    }
    if (Array.isArray(candidate.data)) {
      return candidate.data as Formation[];
    }
    if (Array.isArray(candidate.items)) {
      return candidate.items as Formation[];
    }
  }

  return [];
}

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

  async deleteFormationWorkflow(id: Id): Promise<void> {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async getFormationWorkflowById(id: Id): Promise<Formation> {
    const response = await axios.get<Formation>(`${API_URL}/${id}`);
    return response.data;
  },

  async getAllFormationWorkflows(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(API_URL);
    return normalizeListResponse(response.data);
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

  async getSeancePresenceStats(seanceId: Id): Promise<PresenceStats> {
    const response = await axios.get(`${API_URL}/seances/${seanceId}/presences/stats`);
    return response.data as PresenceStats;
  },

  async getFormationsByAnimateur(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/animateur`);
    return normalizeListResponse(response.data);
  },

  async getFormationsAchevees(): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/achevees`);
    return normalizeListResponse(response.data);
  },

  async getAllFormationWithDocuments(): Promise<Formation[]> {
    // L'endpoint est paginé (défaut 20) ; on demande une grande page pour
    // récupérer toutes les formations avec leurs documents en un seul appel.
    const response = await axios.get<Formation[]>(`${API_URL}/with-documents`, {
      params: { size: 1000 },
    });
    return normalizeListResponse(response.data);
  },

  // Backward-compatible alias used by some legacy pages.
  async getAllFormationsWithDocuments(): Promise<Formation[]> {
    return FormationWorkflowService.getAllFormationWithDocuments();
  },

  async getFormationsForCalendar(enseignantId: Id): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(
      `${API_URL}/enseignants/${enseignantId}/calendar`
    );
    return normalizeListResponse(response.data);
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
    return normalizeListResponse(response.data);
  },

  async getFormationsParUp(upId: Id): Promise<Formation[]> {
    const response = await axios.get<Formation[]>(`${API_URL}/par-up`, {
      params: { upId },
    });
    return normalizeListResponse(response.data);
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
    return normalizeListResponse(response.data);
  },
};

export default FormationWorkflowService;




