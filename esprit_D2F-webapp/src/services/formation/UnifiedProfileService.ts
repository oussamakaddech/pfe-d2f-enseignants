import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';

const BASE = `${config.FORMATION_URL}/api/v1/unified-profiles`;

export interface UnifiedProfile {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  role: string | null;
  departement: string | null;
  unitePedagogique: string | null;
  matricule: string | null;
  grade: string | null;
  statut: string | null;
  isActive: boolean;
}

export interface UnifiedProfileSearchParams {
  search: string;
  role?: string;
  page?: number;
  size?: number;
}

export interface UnifiedProfilePage {
  content: UnifiedProfile[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

function normalizeListResponse<T>(payload: T[] | { content?: T[]; data?: T[]; items?: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const candidate = payload as { content?: unknown[]; data?: unknown[]; items?: unknown[] };
    if (Array.isArray(candidate.content)) return candidate.content as T[];
    if (Array.isArray(candidate.data)) return candidate.data as T[];
    if (Array.isArray(candidate.items)) return candidate.items as T[];
  }
  return [];
}

const UnifiedProfileService = {
  async search(params: UnifiedProfileSearchParams): Promise<UnifiedProfile[]> {
    const res = await axios.get(BASE, {
      params: {
        search: params.search,
        role: params.role,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    });
    const data = res.data;
    if (Array.isArray(data)) return data as UnifiedProfile[];
    if (data && typeof data === 'object') {
      const page = data as UnifiedProfilePage;
      if (Array.isArray(page.content)) return page.content;
      return normalizeListResponse<UnifiedProfile>(data);
    }
    return [];
  },
};

export default UnifiedProfileService;
