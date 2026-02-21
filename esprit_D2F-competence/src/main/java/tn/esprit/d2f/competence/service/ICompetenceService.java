package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;

import java.util.List;

public interface ICompetenceService {
    List<CompetenceDTO> getAllCompetences();
    List<CompetenceDTO> getCompetencesByDomaine(Long domaineId);
    CompetenceDTO getCompetenceById(Long id);
    CompetenceDTO createCompetence(Long domaineId, Competence competence);
    CompetenceDTO updateCompetence(Long id, Competence competence);
    void deleteCompetence(Long id);
}
