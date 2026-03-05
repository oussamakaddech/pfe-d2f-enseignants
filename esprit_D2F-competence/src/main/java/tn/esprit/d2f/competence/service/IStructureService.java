package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.SearchResultDTO;
import tn.esprit.d2f.competence.dto.StructureArbreDTO;

public interface IStructureService {

    /** Obtenir la structure arborescente complète avec statistiques */
    StructureArbreDTO getStructureComplete();

    /** Obtenir la structure d'un domaine spécifique */
    StructureArbreDTO.DomaineArbreDTO getStructureDomaine(Long domaineId);

    /** Recherche globale par mot-clé (retourne domaines, compétences, sous-compétences, savoirs correspondants) */
    SearchResultDTO rechercheGlobale(String keyword);

    /** Recherche par domaine */
    SearchResultDTO rechercheParDomaine(Long domaineId, String keyword);
}
