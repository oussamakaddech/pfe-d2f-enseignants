import CompetenceService from "../../../services/CompetenceService";

const competenceFeatureApi = {
  domaine: CompetenceService.domaine,
  competence: CompetenceService.competence,
  sousCompetence: CompetenceService.sousCompetence,
  savoir: CompetenceService.savoir,
  niveauDefinition: CompetenceService.niveauDefinition,
  structure: CompetenceService.structure,
  enseignantCompetence: CompetenceService.enseignantCompetence,
};

export default competenceFeatureApi;
