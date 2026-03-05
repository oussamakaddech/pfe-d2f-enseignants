package tn.esprit.d2f.competence.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.dto.SavoirRequest;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

import java.util.List;

public interface ISavoirService {
    Page<SavoirDTO> getAllSavoirs(Pageable pageable);
    List<SavoirDTO> getSavoirsBySousCompetence(Long sousCompetenceId);
    List<SavoirDTO> getSavoirsByCompetence(Long competenceId);
    List<SavoirDTO> getSavoirsByType(TypeSavoir type);
    SavoirDTO getSavoirById(Long id);
    SavoirDTO createSavoir(Long sousCompetenceId, SavoirRequest request);
    SavoirDTO createSavoirForCompetence(Long competenceId, SavoirRequest request);
    SavoirDTO updateSavoir(Long id, SavoirRequest request);
    void deleteSavoir(Long id);
    /** Recherche non-paginée (usage interne StructureService). */
    List<SavoirDTO> searchSavoirs(String keyword);
    /** Recherche paginée exposée via l’API REST. */
    Page<SavoirDTO> searchSavoirs(String keyword, Pageable pageable);
}
