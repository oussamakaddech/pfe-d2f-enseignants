package tn.esprit.d2f.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Payload du refus d'un besoin : motif obligatoire (notifié au demandeur). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Requête de refus d'un besoin de formation")
public class RejectBesoinRequest {

    @NotBlank(message = "Le motif du refus est obligatoire")
    @Schema(description = "Motif du refus (transmis au demandeur)", example = "Budget non disponible pour cette période")
    private String reason;
}
