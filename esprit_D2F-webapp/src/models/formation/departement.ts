import type { Id } from '../common';

export interface Departement {
  id?: Id;
  nom?: string;
  code?: string;
  description?: string;
  upId?: Id;
  nomUP?: string;
}
