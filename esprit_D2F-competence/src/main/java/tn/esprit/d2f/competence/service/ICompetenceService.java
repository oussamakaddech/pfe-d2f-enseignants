package tn.esprit.d2f.competence.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.dto.CompetenceRequest;

import java.util.List;

public interface ICompetenceService {
    Page<CompetenceDTO> getAllCompetences(Pageable pageable);
    List<CompetenceDTO> getCompetencesByDomaine(Long domaineId);
    CompetenceDTO getCompetenceById(Long id);
    CompetenceDTO createCompetence(Long domaineId, CompetenceRequest request);
    CompetenceDTO updateCompetence(Long id, CompetenceRequest request);
    void deleteCompetence(Long id);
    /** Recherche non-paginée (usage interne StructureService). */
    List<CompetenceDTO> searchCompetences(String keyword);
    /** Recherche paginée exposée via l’API REST. */
    Page<CompetenceDTO> searchCompetences(String keyword, Pageable pageable);
}
