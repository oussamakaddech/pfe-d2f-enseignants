import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const BASE = `${config.Besoin_URL}/besoins-formation`;

export interface BesoinCompetenceLink {
  id?: number;
  besoinId?: number;
  domaineId?: number | null;
  competenceId?: number | null;
  competenceNom?: string;
  savoirId?: number | null;
  savoirNom?: string;
  sousCompetenceId?: number | null;
}

const BesoinCompetenceService = {
  async getByBesoin(besoinId: number): Promise<BesoinCompetenceLink[]> {
    const r = await axios.get<BesoinCompetenceLink[]>(`${BASE}/${besoinId}/competences`);
    return r.data;
  },

  async replaceAll(besoinId: number, links: BesoinCompetenceLink[]): Promise<BesoinCompetenceLink[]> {
    const r = await axios.put<BesoinCompetenceLink[]>(`${BASE}/${besoinId}/competences`, links);
    return r.data;
  },
};

export default BesoinCompetenceService;
