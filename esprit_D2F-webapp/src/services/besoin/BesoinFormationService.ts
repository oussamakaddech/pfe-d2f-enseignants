import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
import type { Id, ApiListOrPage } from '@/models/common';
import type { BesoinFormation } from '@/models/besoin';

const API_URL = `${config.BESOIN_URL}/besoins-formation`;

export interface BesoinNotification {
  id?: Id;
  message?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

/** Pagination canonique du backend besoin (contrat DSI, cf. PageResponse). */
interface BesoinPage<T> {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 25; // garde-fou : 2500 besoins max — évite une boucle infinie en cas de réponse mal formée.

/** Récupère TOUTES les pages (le backend pagine par défaut à 10 éléments). */
async function fetchAllBesoins<T>(url: string): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  while (page < MAX_PAGES) {
    const response = await axios.get<ApiListOrPage<T> | BesoinPage<T> | T[]>(url, {
      params: { page, size: PAGE_SIZE },
    });
    const data = response.data;
    if (Array.isArray(data)) {
      all.push(...data);
      break;
    }
    const content = (data as BesoinPage<T>).content ?? [];
    all.push(...content);
    const last = (data as BesoinPage<T>).last;
    if (last === undefined || last === true) break;
    page += 1;
  }
  return all;
}

const BesoinFormationService = {
  async getAllBesoinFormations(): Promise<BesoinFormation[]> {
    return fetchAllBesoins<BesoinFormation>(`${API_URL}`);
  },

  async getBesoinFormation(id: Id): Promise<BesoinFormation> {
    const response = await axios.get<BesoinFormation>(`${API_URL}/${id}`);
    return response.data;
  },

  async addBesoinFormation(besoin: Partial<BesoinFormation>): Promise<BesoinFormation> {
    const response = await axios.post<BesoinFormation>(`${API_URL}`, besoin);
    return response.data;
  },

  async removeBesoinFormation(id: Id): Promise<void> {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async modifyBesoinFormation(
    besoinFormation: Partial<BesoinFormation>,
    commentaire: string,
  ): Promise<BesoinFormation> {
    // Backend PUT /api/v1/besoins-formations attend un BesoinFormationRequest
    // PLAT (+ commentaire pour la notification) — pas le wrapper imbriqué
    // { besoinFormation } : celui-ci était silencieusement ignoré par Jackson,
    // laissant un DTO vide rejeté en 400 BESOIN_VALIDATION_ERROR.
    const response = await axios.put<BesoinFormation>(`${API_URL}`, {
      ...besoinFormation,
      commentaire,
    });
    return response.data;
  },

  async getApprovedBesoinFormations(): Promise<BesoinFormation[]> {
    return fetchAllBesoins<BesoinFormation>(`${API_URL}/approved`);
  },

  async approveBesoin(id: Id): Promise<BesoinFormation> {
    const response = await axios.put<BesoinFormation>(`${API_URL}/${id}/approve`);
    return response.data;
  },

  async getUserNotifications(username: string): Promise<BesoinNotification[]> {
    const response = await axios.get<ApiListOrPage<BesoinNotification>>(
      `${API_URL}/notifications/${username}`,
    );
    return (
      (response.data as { content?: BesoinNotification[] }).content ??
      (response.data as BesoinNotification[]) ??
      []
    );
  },

  async getMyBesoins(): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/mine`);
    return (
      (response.data as { content?: BesoinFormation[] }).content ??
      (response.data as BesoinFormation[]) ??
      []
    );
  },

  async getBesoinsByUp(up: string): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/by-up/${up}`);
    return (
      (response.data as { content?: BesoinFormation[] }).content ??
      (response.data as BesoinFormation[]) ??
      []
    );
  },

  async getBesoinsByDepartement(departement: string): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(
      `${API_URL}/by-departement/${departement}`,
    );
    return (
      (response.data as { content?: BesoinFormation[] }).content ??
      (response.data as BesoinFormation[]) ??
      []
    );
  },

  async getBesoinsByPriorite(): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(`${API_URL}/by-priorite`);
    return (
      (response.data as { content?: BesoinFormation[] }).content ??
      (response.data as BesoinFormation[]) ??
      []
    );
  },

  async getBesoinsByPrioriteLevel(priorite: string): Promise<BesoinFormation[]> {
    const response = await axios.get<ApiListOrPage<BesoinFormation>>(
      `${API_URL}/by-priorite/${priorite}`,
    );
    return (
      (response.data as { content?: BesoinFormation[] }).content ??
      (response.data as BesoinFormation[]) ??
      []
    );
  },
};

export default BesoinFormationService;
