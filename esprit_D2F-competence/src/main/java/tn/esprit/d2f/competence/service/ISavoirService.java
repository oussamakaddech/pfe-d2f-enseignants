package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

import java.util.List;

public interface ISavoirService {
    List<SavoirDTO> getAllSavoirs();
    List<SavoirDTO> getSavoirsBySousCompetence(Long sousCompetenceId);
    List<SavoirDTO> getSavoirsByCompetence(Long competenceId);
    List<SavoirDTO> getSavoirsByType(TypeSavoir type);
    SavoirDTO getSavoirById(Long id);
    SavoirDTO createSavoir(Long sousCompetenceId, Savoir savoir);
    SavoirDTO createSavoirForCompetence(Long competenceId, Savoir savoir);
    SavoirDTO updateSavoir(Long id, Savoir savoir);
    void deleteSavoir(Long id);
    List<SavoirDTO> searchSavoirs(String keyword);
}
