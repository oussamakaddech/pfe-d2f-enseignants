import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type { Formation, Inscription } from "@/models/formation";
const API_URL = `${config.FORMATION_URL}/formation/inscription`;

function normalizeContent<T>(payload: T[] | { content?: T[] } | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.content)) return payload.content;
  return [];
}

const InscriptionService = {
  async getFormationsAccessibles(enseignantId: string | number): Promise<Formation[]> {
    const response = await axios.get(`${API_URL}/formations/accessibles`, {
      params: { enseignantId },
    });
    return normalizeContent<Formation>(response.data);
  },

  /** Vue globale ADMIN/CUP : toutes les inscriptions (paginées côté backend). */
  async getAllInscriptions(size = 1000): Promise<unknown[]> {
    const response = await axios.get(`${API_URL}/inscriptions`, { params: { size } });
    return normalizeContent(response.data);
  },

  /** Inscriptions d'un enseignant (résumés) — utilisé pour le pré-contrôle de chevauchement. */
  async getInscriptionsByEnseignant(enseignantId: string | number, size = 200): Promise<unknown[]> {
    const response = await axios.get(`${API_URL}/enseignant/${enseignantId}`, { params: { size } });
    return normalizeContent(response.data);
  },

  async demanderInscription(formationId: string | number, enseignantId: string | number): Promise<Inscription> {
    const response = await axios.post(`${API_URL}/inscriptions`, null, {
      params: { formationId, enseignantId },
    });
    return response.data;
  },

  async getInscriptionsByFormation(formationId: string | number): Promise<Inscription[]> {
    const response = await axios.get(
      `${API_URL}/formations/${formationId}/inscriptions`
    );
    // Le backend renvoie un Page<…> ({content:[...]}) : on normalise en tableau.
    return normalizeContent<Inscription>(response.data);
  },

  async traiterDemande(id: string | number, approuver: boolean, motif?: string): Promise<Inscription> {
    const response = await axios.put(
      `${API_URL}/inscriptions/${id}/traiter`,
      null,
      {
        params: { approuver, motif: motif?.trim() || undefined },
      }
    );
    return response.data;
  },

  /**
   * P3 - F4 : traitement en lot d'un ensemble de demandes.
   * Le backend renvoie la liste des inscriptions effectivement mises à jour.
   */
  async traiterDemandeBulk(
    ids: Array<string | number>,
    approuver: boolean,
    motif?: string,
  ): Promise<Inscription[]> {
    const response = await axios.put(
      `${API_URL}/inscriptions/traiter-bulk`,
      {
        ids: ids.map((i) => Number(i)),
        approuver,
        motif: motif?.trim() || undefined,
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Annulation d'une demande par l'enseignant (uniquement si PENDING).
   *  L'enseignantId (id fonctionnel ou email) est obligatoire côté backend
   *  pour vérifier la propriété de l'inscription. */
  async annulerInscription(id: string | number, enseignantId: string | number): Promise<void> {
    await axios.delete(`${API_URL}/inscriptions/${id}`, {
      params: { enseignantId },
    });
  },
};

export default InscriptionService;
