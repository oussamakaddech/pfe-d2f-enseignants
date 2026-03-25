package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;
import java.util.Map;

public interface ICompetencePrerequisiteService {
    List<CompetencePrerequisiteDTO> getPrerequisitesByCompetence(Long competenceId);

    List<CompetencePrerequisiteDTO> getCompetencesNecessitant(Long prerequisiteId);

    CompetencePrerequisiteDTO addPrerequisite(Long competenceId, CompetencePrerequisiteRequest req);

    CompetencePrerequisiteDTO updateNiveauMinimum(Long id, NiveauMaitrise niveauMinimum);

    boolean prerequisiteBelongsToCompetence(Long competenceId, Long prerequisiteRelationId);

    void removePrerequisite(Long id);

    boolean checkEnseignantMeetsPrerequisites(Long competenceId, String enseignantId);

    Map<String, Object> checkEnseignantEligibilityDetails(Long competenceId, String enseignantId);

    long countByCompetenceId(Long competenceId);
}
