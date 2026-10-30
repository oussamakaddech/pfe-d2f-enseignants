package esprit.pfe.serviceformation.dto.animator;

import esprit.pfe.serviceformation.entities.AnimatorRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Auto-proposition d'un enseignant / animateur.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelfProposalRequest {

    @NotNull(message = "role est obligatoire")
    private AnimatorRole role;

    @NotBlank(message = "La motivation est obligatoire pour une auto-proposition")
    @Size(min = 10, max = 2000, message = "motivation : entre 10 et 2000 caractères")
    private String motivation;
}
