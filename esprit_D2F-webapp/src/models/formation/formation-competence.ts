import type { Id } from '../common';

export interface FormationCompetence {
  id?: Id;
  formationId?: Id;
  competenceId?: Id;
  competenceNom?: string;
  type?: string;
}

/**
 * Liaison minimale formation ↔ compétence renvoyée par
 * `GET /formation-competences/all` : sert au filtre « par compétence » du
 * catalogue et à son export Excel.
 */
export interface FormationCompetenceLink {
  formationId?: Id;
  competenceId?: Id;
  competenceNom?: string;
}
