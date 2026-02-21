package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.entity.SousCompetence;

import java.util.List;

public interface ISousCompetenceService {
    List<SousCompetenceDTO> getAllSousCompetences();
    List<SousCompetenceDTO> getSousCompetencesByCompetence(Long competenceId);
    SousCompetenceDTO getSousCompetenceById(Long id);
    SousCompetenceDTO createSousCompetence(Long competenceId, SousCompetence sousCompetence);
    SousCompetenceDTO updateSousCompetence(Long id, SousCompetence sousCompetence);
    void deleteSousCompetence(Long id);
}
