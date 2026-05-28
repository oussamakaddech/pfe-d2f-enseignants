package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Formation-Competence relationship.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "FormationCompetenceDTO", description = "Competence associated with a formation")
public class FormationCompetenceDTO {

    @Schema(description = "Association ID", example = "1")
    private Long id;

    @Schema(description = "Formation ID", example = "42")
    private Long formationId;

    @Schema(description = "Competence ID", example = "5")
    private Long competenceId;

    @Schema(description = "Competence name")
    private String competenceName;

    @Schema(description = "Competence domain")
    private String domain;

    @Schema(description = "Is this a primary competence for the formation")
    private Boolean isPrimary;
}
