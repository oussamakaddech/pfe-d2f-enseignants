import type { Id } from '../common';

export interface FormationCompetence {
  id?: Id;
  formationId?: Id;
  competenceId?: Id;
  competenceNom?: string;
  type?: string;
}
