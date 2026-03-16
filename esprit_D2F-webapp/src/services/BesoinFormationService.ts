import axios from "axios";
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
    const response = await axios.get<BesoinFormation[]>(
      `${API_URL}/retrieve-all-BesoinFormations`
    );
    return response.data;
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
    const response = await axios.get<BesoinFormation[]>(
      `${API_URL}/retrieve-approved-BesoinFormations`
    );
    return response.data;
  },

  async approveBesoin(id: Id): Promise<BesoinFormation> {
    const response = await axios.put<BesoinFormation>(`${API_URL}/${id}/approve`);
    return response.data;
  },

  async getUserNotifications(username: string): Promise<string[]> {
    const response = await axios.get<string[]>(`${API_URL}/notifications/${username}`);
    return response.data;
  },
};

export default BesoinFormationService;
