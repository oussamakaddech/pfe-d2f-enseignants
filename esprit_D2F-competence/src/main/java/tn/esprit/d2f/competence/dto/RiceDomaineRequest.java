package tn.esprit.d2f.competence.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiceDomaineRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String nom;

    private String description;

    /**
     * Domaine du référentiel auquel rattacher CE domaine RICE (choisi dans le
     * panneau de revue). Prime sur le domaine par défaut de la requête.
     */
    private String domaineCibleId;

    @Valid
    private List<RiceCompetenceRequest> competences;
}
