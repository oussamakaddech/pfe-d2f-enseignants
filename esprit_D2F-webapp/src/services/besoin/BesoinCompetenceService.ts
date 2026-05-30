import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
import type { BesoinCompetenceLink } from "@/models/besoin";

const BASE = `${config.BESOIN_URL}/besoins-formation`;

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
