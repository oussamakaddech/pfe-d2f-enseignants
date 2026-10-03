import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
import type { AnimateurExterne, AnimateurExterneRequest } from '@/models/bureau';

const bureauUrl = (bureauId: number) =>
  `${config.FORMATION_URL}/formation/bureaux/${bureauId}/animateurs`;

const PAGE_SIZE = 200;

function normalizeListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const content = (payload as { content?: unknown } | null)?.content;
  return Array.isArray(content) ? (content as T[]) : [];
}

const AnimateurExterneService = {
  async getByBureau(bureauId: number): Promise<AnimateurExterne[]> {
    // Le backend renvoie une Page Spring ({ content: [...] }, 20 par défaut).
    const response = await axios.get(bureauUrl(bureauId), {
      params: { page: 0, size: PAGE_SIZE },
    });
    return normalizeListResponse<AnimateurExterne>(response.data);
  },

  async create(bureauId: number, data: AnimateurExterneRequest): Promise<AnimateurExterne> {
    const response = await axios.post(bureauUrl(bureauId), data);
    return response.data;
  },

  async update(
    bureauId: number,
    id: number,
    data: AnimateurExterneRequest,
  ): Promise<AnimateurExterne> {
    const response = await axios.put(`${bureauUrl(bureauId)}/${id}`, data);
    return response.data;
  },

  async delete(bureauId: number, id: number): Promise<void> {
    await axios.delete(`${bureauUrl(bureauId)}/${id}`);
  },
};

export default AnimateurExterneService;
