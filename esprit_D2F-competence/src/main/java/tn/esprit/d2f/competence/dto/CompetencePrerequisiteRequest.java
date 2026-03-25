package tn.esprit.d2f.competence.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetencePrerequisiteRequest {

    @NotNull(message = "Le prérequis est obligatoire")
    private Long prerequisiteId;

    @NotNull(message = "Le niveau minimum est obligatoire")
    private NiveauMaitrise niveauMinimum;

    private String description;
}
