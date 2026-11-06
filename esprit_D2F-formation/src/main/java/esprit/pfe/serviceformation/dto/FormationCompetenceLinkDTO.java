package esprit.pfe.serviceformation.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.io.Serializable;

/**
 * Liaison minimale formation ↔ compétence : sert au filtre « par compétence »
 * du catalogue des formations (et à son export Excel), qui a besoin de la
 * correspondance complète en une seule requête.
 */
@Schema(name = "FormationCompetenceLinkDTO", description = "Lien formation ↔ compétence")
public record FormationCompetenceLinkDTO(
        @Schema(description = "Formation ID", example = "42") Long formationId,
        @Schema(description = "Compétence ID", example = "5") Long competenceId,
        @Schema(description = "Nom de la compétence (dénormalisé, peut être absent)") String competenceNom
) implements Serializable {
}
