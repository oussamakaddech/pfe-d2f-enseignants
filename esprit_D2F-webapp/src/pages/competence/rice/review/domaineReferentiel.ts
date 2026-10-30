// domaineReferentiel — projection d'un domaine du référentiel (page
// « Référentiel des Compétences ») sur les champs du nœud Domaine de la revue
// RICE. Le rattachement retenu (`domaineExistantId`) est envoyé à l'import :
// le domaine RICE devient alors une compétence de ce domaine.

import type { Domaine } from '@/models/competence';

/**
 * Champs à appliquer au nœud Domaine quand l'utilisateur choisit un domaine du
 * référentiel : code, nom et description sont repris tels quels (le code RICE
 * sert de repli quand le domaine n'en a pas).
 */
export function champsDepuisDomaine(domaine: Domaine, codeDeRepli = ''): Record<string, unknown> {
  return {
    domaineExistantId: String(domaine.id),
    code: domaine.code || codeDeRepli,
    nom: domaine.nom ?? '',
    description: domaine.description ?? '',
  };
}
