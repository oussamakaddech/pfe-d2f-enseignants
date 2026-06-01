import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type { AnimateurExterne, AnimateurExterneRequest } from "@/models/bureau";

const bureauUrl = (bureauId: number) =>
  `${config.FORMATION_URL}/formation/bureaux/${bureauId}/animateurs`;

const AnimateurExterneService = {
  async getByBureau(bureauId: number): Promise<AnimateurExterne[]> {
    const response = await axios.get(bureauUrl(bureauId));
    return Array.isArray(response.data) ? (response.data as AnimateurExterne[]) : [];
  },

  async create(bureauId: number, data: AnimateurExterneRequest): Promise<AnimateurExterne> {
    const response = await axios.post(bureauUrl(bureauId), data);
    return response.data;
  },

  async update(bureauId: number, id: number, data: AnimateurExterneRequest): Promise<AnimateurExterne> {
    const response = await axios.put(`${bureauUrl(bureauId)}/${id}`, data);
    return response.data;
  },

  async delete(bureauId: number, id: number): Promise<void> {
    await axios.delete(`${bureauUrl(bureauId)}/${id}`);
  },
};

export default AnimateurExterneService;
