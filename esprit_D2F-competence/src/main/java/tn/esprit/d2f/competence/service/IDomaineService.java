package tn.esprit.d2f.competence.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.dto.DomaineRequest;

import java.util.List;

public interface IDomaineService {
    Page<DomaineDTO> getAllDomaines(Pageable pageable);
    List<DomaineDTO> getDomainesActifs();
    DomaineDTO getDomaineById(Long id);
    DomaineDTO getDomaineByCode(String code);
    DomaineDTO createDomaine(DomaineRequest request);
    DomaineDTO updateDomaine(Long id, DomaineRequest request);
    void deleteDomaine(Long id);
    DomaineDTO toggleActif(Long id);
    /** Recherche non-paginée (usage interne StructureService). */
    List<DomaineDTO> searchDomaines(String keyword);
    /** Recherche paginée exposée via l’API REST. */
    Page<DomaineDTO> searchDomaines(String keyword, Pageable pageable);
}
