package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.NiveauSavoirRequisDTO;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisRequest;
import tn.esprit.d2f.competence.dto.NiveauxGroupesDTO;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;

public interface INiveauDefinitionService {

    /** Obtenir tous les savoirs requis groupés par niveau pour une compétence */
NiveauxGroupesDTO getNiveauxByCompetence(Long competenceId);

    /** Obtenir tous les savoirs requis groupés par niveau pour une sous-compétence */
    NiveauxGroupesDTO getNiveauxBySousCompetence(Long sousCompetenceId);

    /** Obtenir les savoirs requis pour un niveau spécifique d'une compétence */
    List<NiveauSavoirRequisDTO> getSavoirsRequisByCompetenceAndNiveau(Long competenceId, NiveauMaitrise niveau);

    /** Obtenir les savoirs requis pour un niveau spécifique d'une sous-compétence */
    List<NiveauSavoirRequisDTO> getSavoirsRequisBySousCompetenceAndNiveau(Long sousCompetenceId, NiveauMaitrise niveau);

    /** Associer un savoir requis à un niveau */
    NiveauSavoirRequisDTO addSavoirRequis(NiveauSavoirRequisRequest request);

    /** Mettre à jour une association savoir-niveau */
    NiveauSavoirRequisDTO updateSavoirRequis(Long id, NiveauSavoirRequisRequest request);

    /** Supprimer une association savoir-niveau */
    void removeSavoirRequis(Long id);

    /** Obtenir tous les niveaux définis */
    List<NiveauSavoirRequisDTO> getAll();
}
