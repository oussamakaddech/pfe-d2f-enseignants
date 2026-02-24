package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.StructureArbreDTO;

import java.util.List;
import java.util.Map;

public interface IStructureService {

    /** Obtenir la structure arborescente complète avec statistiques */
    StructureArbreDTO getStructureComplete();

    /** Obtenir la structure d'un domaine spécifique */
    StructureArbreDTO.DomaineArbreDTO getStructureDomaine(Long domaineId);

    /** Recherche globale par mot-clé (retourne domaines, compétences, sous-compétences, savoirs correspondants) */
    Map<String, Object> rechercheGlobale(String keyword);

    /** Recherche par domaine */
    Map<String, Object> rechercheParDomaine(Long domaineId, String keyword);
}
