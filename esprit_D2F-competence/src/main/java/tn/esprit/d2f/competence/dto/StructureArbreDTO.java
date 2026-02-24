package tn.esprit.d2f.competence.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

/**
 * DTO pour la structure arborescente complète :
 * Domaine → Compétences → Sous-Compétences → Savoirs (+ Niveaux)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StructureArbreDTO {

    private List<DomaineArbreDTO> domaines;
    private StatistiquesDTO statistiques;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DomaineArbreDTO {
        private Long id;
        private String code;
        private String nom;
        private String description;
        private Boolean actif;
        private int nombreCompetences;
        private long nombreEnseignants;
        private List<CompetenceArbreDTO> competences;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CompetenceArbreDTO {
        private Long id;
        private String code;
        private String nom;
        private String description;
        private Integer ordre;
        private int nombreSousCompetences;
        private int nombreSavoirs;
        private long nombreEnseignants;
        private List<SousCompetenceArbreDTO> sousCompetences;
        private List<SavoirDTO> savoirsDirect;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SousCompetenceArbreDTO {
        private Long id;
        private String code;
        private String nom;
        private String description;
        private int nombreSavoirs;
        private long nombreEnseignants;
        private List<SavoirDTO> savoirs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatistiquesDTO {
        private int totalDomaines;
        private int totalCompetences;
        private int totalSousCompetences;
        private int totalSavoirs;
        private int totalSavoirsTheoriques;
        private int totalSavoirsPratiques;
    }
}
