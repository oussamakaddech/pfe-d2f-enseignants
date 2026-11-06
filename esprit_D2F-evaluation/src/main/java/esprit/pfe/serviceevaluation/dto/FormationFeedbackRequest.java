package esprit.pfe.serviceevaluation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Réponse au questionnaire de satisfaction (échelle 1 « Pas du tout satisfaisant » à 5 « Très satisfaisant »). */
@Data
public class FormationFeedbackRequest {

    @NotNull(message = "La formation est obligatoire")
    private Long formationId;

    @NotNull(message = "Évaluez l'aspect organisationnel")
    @Min(1) @Max(5)
    private Integer aspectOrganisationnel;

    @NotNull(message = "Évaluez l'aspect technique")
    @Min(1) @Max(5)
    private Integer aspectTechnique;

    @NotNull(message = "Évaluez l'aspect pédagogique")
    @Min(1) @Max(5)
    private Integer aspectPedagogique;

    @NotNull(message = "Indiquez si vous avez besoin d'une formation complémentaire")
    private Boolean besoinComplementaire;

    @Size(max = 2000)
    private String autresInformations;

    @Size(max = 2000)
    private String autresBesoins;
}
