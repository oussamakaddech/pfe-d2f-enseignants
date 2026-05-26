import CompetenceService from "@/services/competence/CompetenceService";
import type { TreeNode, NiveauDefinition, EnseignantCompetence, AssignRequest, PrerequisiteRequest } from "@/services/competence/CompetenceService";

export function useCompetenceDomaineApi() {
  return CompetenceService.domaine;
}

export function useCompetenceApi() {
  return CompetenceService.competence;
}

export function useSousCompetenceApi() {
  return CompetenceService.sousCompetence;
}

export function useSavoirApi() {
  return CompetenceService.savoir;
}

export function useEnseignantCompetenceApi() {
  return CompetenceService.enseignantCompetence;
}

export function useNiveauDefinitionApi() {
  return CompetenceService.niveauDefinition;
}

export function useStructureApi() {
  return CompetenceService.structure;
}

export function usePrerequisiteApi() {
  return CompetenceService.prerequisite;
}

export { type TreeNode, type NiveauDefinition, type EnseignantCompetence, type AssignRequest, type PrerequisiteRequest };
