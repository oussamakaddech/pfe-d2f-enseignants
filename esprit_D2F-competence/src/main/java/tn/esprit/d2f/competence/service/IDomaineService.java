package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.entity.Domaine;

import java.util.List;

public interface IDomaineService {
    List<DomaineDTO> getAllDomaines();
    List<DomaineDTO> getDomainesActifs();
    DomaineDTO getDomaineById(Long id);
    DomaineDTO getDomaineByCode(String code);
    DomaineDTO createDomaine(Domaine domaine);
    DomaineDTO updateDomaine(Long id, Domaine domaine);
    void deleteDomaine(Long id);
    DomaineDTO toggleActif(Long id);
}
