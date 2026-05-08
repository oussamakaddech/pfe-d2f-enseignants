import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env";
import type { Id } from "../models/common";
import type { BesoinFormation } from "../models/besoin";

const API_URL = `${config.Besoin_URL}/besoinsformation/besoinsFormations`;

interface ModifyBesoinPayload {
  besoinFormation: Partial<BesoinFormation>;
  commentaire: string;
}

const BesoinFormationService = {
  async getAllBesoinFormations(): Promise<BesoinFormation[]> {
    const response = await axios.get<any>(
      `${API_URL}/retrieve-all-BesoinFormations`
    );
    // Le backend renvoie une Page Spring Data, les données sont dans 'content'
    return response.data?.content || response.data || [];
  },

  async getBesoinFormation(id: Id): Promise<BesoinFormation> {
    const response = await axios.get<BesoinFormation>(
      `${API_URL}/retrieve-BesoinFormation/${id}`
    );
    return response.data;
  },

  async addBesoinFormation(
    besoin: Partial<BesoinFormation>
  ): Promise<BesoinFormation> {
    const response = await axios.post<BesoinFormation>(
      `${API_URL}/add-BesoinFormation`,
      besoin
    );
    return response.data;
  },

  async removeBesoinFormation(id: Id): Promise<unknown> {
    const response = await axios.delete(`${API_URL}/remove-BesoinFormation/${id}`);
    return response.data;
  },

  async modifyBesoinFormation(
    besoinFormation: Partial<BesoinFormation>,
    commentaire: string
  ): Promise<BesoinFormation> {
    const payload: ModifyBesoinPayload = {
      besoinFormation,
      commentaire,
    };
    const response = await axios.put<BesoinFormation>(
      `${API_URL}/modify-BesoinFormation`,
      payload
    );
    return response.data;
  },

  async getApprovedBesoinFormations(): Promise<BesoinFormation[]> {
    const response = await axios.get<any>(
      `${API_URL}/retrieve-approved-BesoinFormations`
    );
    return response.data?.content || response.data || [];
  },

  async approveBesoin(id: Id): Promise<BesoinFormation> {
    const response = await axios.put<BesoinFormation>(`${API_URL}/${id}/approve`);
    return response.data;
  },

  async getUserNotifications(username: string): Promise<any[]> {
    const response = await axios.get<any>(`${API_URL}/notifications/${username}`);
    return response.data?.content || response.data || [];
  },

  // ── Nouveaux endpoints §2.2.2 — Consultation et priorisation ──

  async getBesoinsByUp(up: string): Promise<BesoinFormation[]> {
    const response = await axios.get<any>(`${API_URL}/by-up/${up}`);
    return response.data?.content || response.data || [];
  },

  async getBesoinsByDepartement(departement: string): Promise<BesoinFormation[]> {
    const response = await axios.get<any>(
      `${API_URL}/by-departement/${departement}`
    );
    return response.data?.content || response.data || [];
  },

  async getBesoinsByPriorite(): Promise<BesoinFormation[]> {
    const response = await axios.get<any>(`${API_URL}/by-priorite`);
    return response.data?.content || response.data || [];
  },

  async getBesoinsByPrioriteLevel(priorite: string): Promise<BesoinFormation[]> {
    const response = await axios.get<any>(
      `${API_URL}/by-priorite/${priorite}`
    );
    return response.data?.content || response.data || [];
  },
};

export default BesoinFormationService;
