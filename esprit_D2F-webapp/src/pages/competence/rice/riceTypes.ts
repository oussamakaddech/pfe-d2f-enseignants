import type { RiceDomaine } from "@/models/competence";

export interface EnseignantRef extends Record<string, unknown> {
  id?: string | number;
  enseignantId?: string | number;
  nom?: string;
  prenom?: string;
  modules?: string[];
}

export interface ExtractedEnseignant extends Record<string, unknown> {
  nom_complet?: string;
  fichier?: string;
  matched_id?: string | number;
}

export interface AnalysisResult extends Record<string, unknown> {
  propositions?: RiceDomaine[];
  extractedEnseignants?: ExtractedEnseignant[];
  foundEnseignants?: EnseignantRef[];
  detectedDepartement?: string;
  detectedDepartment?: string;
  departementDetecte?: string;
  departement_detecte?: string;
  stats?: { departement?: string };
}

export interface CreateEnsTarget {
  path?: number[];
  eid?: string;
}
