package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;

public interface IEnseignantCompetenceService {
    List<EnseignantCompetenceDTO> getCompetencesByEnseignant(String enseignantId);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndDomaine(String enseignantId, Long domaineId);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndCompetence(String enseignantId, Long competenceId);
    List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndNiveau(String enseignantId, NiveauMaitrise niveau);
    EnseignantCompetenceDTO assignCompetence(EnseignantCompetenceRequest request);
    EnseignantCompetenceDTO updateNiveau(Long id, NiveauMaitrise niveau);
    void removeCompetence(Long id);
    long countCompetences(String enseignantId);
}
