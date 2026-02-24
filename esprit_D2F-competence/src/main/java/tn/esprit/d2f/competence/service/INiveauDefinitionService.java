package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.NiveauSavoirRequisDTO;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;
import java.util.Map;

public interface INiveauDefinitionService {

    /** Obtenir tous les savoirs requis groupés par niveau pour une compétence */
    Map<String, List<NiveauSavoirRequisDTO>> getNiveauxByCompetence(Long competenceId);

    /** Obtenir tous les savoirs requis groupés par niveau pour une sous-compétence */
    Map<String, List<NiveauSavoirRequisDTO>> getNiveauxBySousCompetence(Long sousCompetenceId);

    /** Obtenir les savoirs requis pour un niveau spécifique d'une compétence */
    List<NiveauSavoirRequisDTO> getSavoirsRequisByCompetenceAndNiveau(Long competenceId, NiveauMaitrise niveau);

    /** Obtenir les savoirs requis pour un niveau spécifique d'une sous-compétence */
    List<NiveauSavoirRequisDTO> getSavoirsRequisBySousCompetenceAndNiveau(Long sousCompetenceId, NiveauMaitrise niveau);

    /** Associer un savoir requis à un niveau */
    NiveauSavoirRequisDTO addSavoirRequis(NiveauSavoirRequisRequest request);

    /** Supprimer une association savoir-niveau */
    void removeSavoirRequis(Long id);

    /** Obtenir tous les niveaux définis */
    List<NiveauSavoirRequisDTO> getAll();
}
