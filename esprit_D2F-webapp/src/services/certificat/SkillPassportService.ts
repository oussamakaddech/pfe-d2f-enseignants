import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type { TeacherSkillPassportDTO } from "@/models/certificat";

// ── Base URL versionnée conforme DSI (/api/v1/skill-passports → service-analyse) ──
const BASE_URL = `${config.GATEWAY_URL}/api/v1/skill-passports`;

// ── Utilitaire : téléchargement d'un Blob PDF ──────────────────────────────
function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  globalThis.URL.revokeObjectURL(url);
  a.remove();
}

// ── Service principal ──────────────────────────────────────────────────────
const SkillPassportService = {
  /**
   * Télécharge le PDF du passeport de l'enseignant connecté.
   */
  async downloadMyPassport(): Promise<void> {
    const response = await axios.get(`${BASE_URL}/me`, {
      responseType: "blob",
    });
    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    downloadPdfBlob(response.data as Blob, `skill-passport-me-${today}.pdf`);
  },

  /**
   * Télécharge le PDF du passeport d'un enseignant cible (admin/CUP).
   */
  async downloadPassportByUsername(username: string): Promise<void> {
    const response = await axios.get(`${BASE_URL}/teacher/${username}`, {
      responseType: "blob",
    });
    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    downloadPdfBlob(response.data as Blob, `skill-passport-${username}-${today}.pdf`);
  },

  /**
   * Récupère les données JSON du passeport de l'enseignant connecté.
   */
  async getMyPassportData(): Promise<TeacherSkillPassportDTO> {
    const response = await axios.get<TeacherSkillPassportDTO>(`${BASE_URL}/me/json`);
    return response.data;
  },

  /**
   * Récupère les données JSON du passeport d'un enseignant cible.
   */
  async getPassportDataByUsername(username: string): Promise<TeacherSkillPassportDTO> {
    const response = await axios.get<TeacherSkillPassportDTO>(
      `${BASE_URL}/teacher/${username}/json`
    );
    return response.data;
  },
};

export default SkillPassportService;




