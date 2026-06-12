/**
 * CalendarService — API « Calendrier des ateliers » (service-formation).
 * Convention DSI : FORMATION_URL inclut déjà /api ; on ne re-préfixe pas /api.
 * Le gateway réécrit /api/formation/** -> /api/v1/**.
 */
import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type {
  CalendarFormation,
  CalendarFormationFilters,
  CalendarPage,
  CalendarParticipant,
  ConflictReport,
  ImportReport,
  ParsedCalendar,
  SendInvitationsResult,
} from "@/models/calendar";

const API_URL = `${config.FORMATION_URL}/formation/calendar`;

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  }
}

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?(.+?)"?$/.exec(disposition);
  return match ? match[1] : fallback;
}

async function downloadIcs(path: string, fallbackName: string): Promise<void> {
  const response = await axios.get(`${API_URL}${path}`, { responseType: "blob" });
  const filename = filenameFromDisposition(
    response.headers["content-disposition"] as string | undefined,
    fallbackName
  );
  triggerBrowserDownload(new Blob([response.data], { type: "text/calendar" }), filename);
}

const CalendarService = {
  /** Aperçu sans persistance. */
  async preview(file: File): Promise<ParsedCalendar> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post<ParsedCalendar>(`${API_URL}/import/preview`, formData);
    return data;
  },

  /** Import complet et persistant. */
  async importCalendar(file: File): Promise<ImportReport> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post<ImportReport>(`${API_URL}/import`, formData);
    return data;
  },

  async listFormations(filters: CalendarFormationFilters = {}): Promise<CalendarPage<CalendarFormation>> {
    const { data } = await axios.get<CalendarPage<CalendarFormation>>(`${API_URL}/formations`, {
      params: {
        titre: filters.titre || undefined,
        etat: filters.etat || undefined,
        page: filters.page ?? 0,
        size: filters.size ?? 20,
      },
    });
    return data;
  },

  async getFormation(id: number): Promise<CalendarFormation> {
    const { data } = await axios.get<CalendarFormation>(`${API_URL}/formations/${id}`);
    return data;
  },

  async getParticipants(id: number, page = 0, size = 50): Promise<CalendarPage<CalendarParticipant>> {
    const { data } = await axios.get<CalendarPage<CalendarParticipant>>(
      `${API_URL}/formations/${id}/participants`,
      { params: { page, size } }
    );
    return data;
  },

  async getConflicts(): Promise<ConflictReport> {
    const { data } = await axios.get<ConflictReport>(`${API_URL}/conflicts`);
    return data;
  },

  downloadIcsAll(): Promise<void> {
    return downloadIcs("/export/ics/all", "calendrier-complet.ics");
  },

  downloadIcsFormation(id: number): Promise<void> {
    return downloadIcs(`/export/ics/formation/${id}`, `formation-${id}.ics`);
  },

  downloadIcsParticipant(email: string): Promise<void> {
    return downloadIcs(`/export/ics/participant/${encodeURIComponent(email)}`, "mon-calendrier.ics");
  },

  async sendInvitations(formationId: number): Promise<SendInvitationsResult> {
    const { data } = await axios.post<SendInvitationsResult>(`${API_URL}/send-invitations/${formationId}`);
    return data;
  },

  async sendAllInvitations(): Promise<SendInvitationsResult> {
    const { data } = await axios.post<SendInvitationsResult>(`${API_URL}/send-invitations/all`);
    return data;
  },
};

export default CalendarService;
