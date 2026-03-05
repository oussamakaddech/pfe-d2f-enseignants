package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.util.List;

/**
 * Résultat d'une recherche globale ou filtrée par domaine.
 * Remplace le raw {@code Map<String, Object>} renvoyé par les endpoints /structure/recherche.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchResultDTO {

    private String keyword;

    private List<DomaineDTO> domaines;

    private List<CompetenceDTO> competences;

    private List<SousCompetenceDTO> sousCompetences;

    private List<SavoirDTO> savoirs;

    /** Total combiné de tous les résultats. */
    private int totalResults;
}
