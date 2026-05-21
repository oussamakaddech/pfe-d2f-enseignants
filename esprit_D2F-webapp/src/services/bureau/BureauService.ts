import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
import { requireAuthHeader } from "@/services/auth/authHeaders";
import type { BureauRequest } from "@/models/bureau";

const API_URL = `${config.FORMATION_URL}/formation/bureaux`;

const BureauService = {
  async getAllBureaux() {
    const response = await axios.get(API_URL, { headers: requireAuthHeader() });
    return response.data;
  },

  async getBureauById(id: number) {
    const response = await axios.get(`${API_URL}/${id}`, { headers: requireAuthHeader() });
    return response.data;
  },

  async createBureau(data: BureauRequest) {
    const response = await axios.post(API_URL, data, { headers: requireAuthHeader() });
    return response.data;
  },

  async updateBureau(id: number, data: BureauRequest) {
    const response = await axios.put(`${API_URL}/${id}`, data, { headers: requireAuthHeader() });
    return response.data;
  },

  async deleteBureau(id: number) {
    await axios.delete(`${API_URL}/${id}`, { headers: requireAuthHeader() });
  },
};

export default BureauService;
