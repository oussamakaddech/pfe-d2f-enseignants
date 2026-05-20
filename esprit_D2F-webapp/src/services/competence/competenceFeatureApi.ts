import CompetenceService from "@/services/competence/CompetenceService";

const competenceFeatureApi = {
  domaine: CompetenceService.domaine,
  competence: CompetenceService.competence,
  sousCompetence: CompetenceService.sousCompetence,
  savoir: CompetenceService.savoir,
  niveauDefinition: CompetenceService.niveauDefinition,
  structure: CompetenceService.structure,
  enseignantCompetence: CompetenceService.enseignantCompetence,
  prerequisite: CompetenceService.prerequisite,
};

export default competenceFeatureApi;
