import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type { Id, ApiListOrPage } from "@/models/common";
import type { BesoinFormation } from "@/models/besoin";

const API_URL = `${config.BESOIN_URL}/besoins-formation`;

interface ModifyBesoinPayload {
  besoinFormation: Partial<BesoinFormation>;
  commentaire: string;
}

export interface BesoinNotification {
  id?: Id;
  message?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

const BesoinFormationService = {
  async getAllBesoinFormations(): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}`);
    return (response.data as { content?: BesoinFormation[] }).content ?? (response.data as BesoinFormation[]) ?? [];
  },

  async getBesoinFormation(id: Id): Promise<BesoinFormation> {
    const response = await axios.get<BesoinFormation>(`${API_URL}/${id}`);
    return response.data;
  },

  async addBesoinFormation(
    besoin: Partial<BesoinFormation>
  ): Promise<BesoinFormation> {
    const response = await axios.post<BesoinFormation>(`${API_URL}`, besoin);
    return response.data;
  },

  async removeBesoinFormation(id: Id): Promise<void> {
    const response = await axios.delete(`${API_URL}/${id}`);
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
    const response = await axios.put<BesoinFormation>(`${API_URL}`, payload);
    return response.data;
  },

  async getApprovedBesoinFormations(): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/approved`);
    return (response.data as { content?: BesoinFormation[] }).content ?? (response.data as BesoinFormation[]) ?? [];
  },

  async approveBesoin(id: Id): Promise<BesoinFormation> {
    const response = await axios.put<BesoinFormation>(`${API_URL}/${id}/approve`);
    return response.data;
  },

  async getUserNotifications(username: string): Promise<BesoinNotification[]> {
    const response = await axios.get<ApiListOrPage<BesoinNotification>>(`${API_URL}/notifications/${username}`);
    return (response.data as { content?: BesoinNotification[] }).content ?? (response.data as BesoinNotification[]) ?? [];
  },

  async getBesoinsByUp(up: string): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/by-up/${up}`);
    return (response.data as { content?: BesoinFormation[] }).content ?? (response.data as BesoinFormation[]) ?? [];
  },

  async getBesoinsByDepartement(departement: string): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/by-departement/${departement}`);
    return (response.data as { content?: BesoinFormation[] }).content ?? (response.data as BesoinFormation[]) ?? [];
  },

  async getBesoinsByPriorite(): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/by-priorite`);
    return (response.data as { content?: BesoinFormation[] }).content ?? (response.data as BesoinFormation[]) ?? [];
  },

  async getBesoinsByPrioriteLevel(priorite: string): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/by-priorite/${priorite}`);
    return (response.data as { content?: BesoinFormation[] }).content ?? (response.data as BesoinFormation[]) ?? [];
  },
};

export default BesoinFormationService;
