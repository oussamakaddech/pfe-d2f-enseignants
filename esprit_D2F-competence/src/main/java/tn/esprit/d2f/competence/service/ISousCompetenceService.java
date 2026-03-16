package tn.esprit.d2f.competence.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.dto.SousCompetenceRequest;

import java.util.List;

public interface ISousCompetenceService {
    Page<SousCompetenceDTO> getAllSousCompetences(Pageable pageable);
    List<SousCompetenceDTO> getSousCompetencesByCompetence(Long competenceId);
    SousCompetenceDTO getSousCompetenceById(Long id);
    SousCompetenceDTO createSousCompetence(Long competenceId, SousCompetenceRequest request);
    SousCompetenceDTO createSousCompetenceEnfant(Long parentId, SousCompetenceRequest request);
    SousCompetenceDTO updateSousCompetence(Long id, SousCompetenceRequest request);
    void deleteSousCompetence(Long id);
    /** Recherche non-paginée (usage interne StructureService). */
    List<SousCompetenceDTO> searchSousCompetences(String keyword);
    /** Recherche paginée exposée via l’API REST. */
    Page<SousCompetenceDTO> searchSousCompetences(String keyword, Pageable pageable);
}
