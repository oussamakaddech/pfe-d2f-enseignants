// Modèle de l'arbre de compétences RICE (Domaine → Compétence → Sous-compétence → Savoir).
// Index signature `[key: string]: unknown` conservée car le backend peut renvoyer
// des champs additionnels non typés ; les champs connus restent strictement typés.

export type EnseignantId = string | number;

export interface RiceSavoir {
  code?: string | null;
  nom: string;
  type?: string;
  niveau?: string | null;
  enseignantsSuggeres?: EnseignantId[];
  aiSuggestedIds?: EnseignantId[];
  tmpId?: string;
  [key: string]: unknown;
}

export interface RiceSousCompetence {
  code?: string;
  nom: string;
  savoirs?: RiceSavoir[];
  [key: string]: unknown;
}

export interface RiceCompetence {
  code?: string;
  nom: string;
  savoirs?: RiceSavoir[];
  sousCompetences?: RiceSousCompetence[];
  [key: string]: unknown;
}

export interface RiceDomaine {
  code?: string;
  nom: string;
  competences?: RiceCompetence[];
  [key: string]: unknown;
}

/** Savoir aplati avec sa position dans l'arbre et ses libellés de contexte. */
export interface RiceFlatSavoir extends RiceSavoir {
  di: number;
  ci: number;
  sci: number;
  si: number;
  domaineCode?: string;
  domaineNom: string;
  competenceCode?: string;
  competenceNom: string;
  sousCompetenceCode?: string | null;
  sousCompetenceNom?: string | null;
  label: string;
}

/** Chemin [di, ci, sci, si] vers un nœud de l'arbre (segments optionnels selon le niveau). */
export type RiceTreePath = number[];

export interface RiceEditingNom {
  path: RiceTreePath;
  value: string;
}

export interface RiceMergeRef {
  di: number;
  ci: number;
  sci: number;
  si: number;
}
