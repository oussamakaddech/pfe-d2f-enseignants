package esprit.pfe.serviceformation.dto.animator;

import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.ProposerType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Proposition d'un animateur par un responsable (CUP / ADMIN).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerProposalRequest {

    @NotBlank(message = "proposerId est obligatoire")
    private String proposerId;

    @NotNull(message = "proposerType est obligatoire")
    private ProposerType proposerType;

    @NotNull(message = "role est obligatoire")
    private AnimatorRole role;

    @Size(max = 2000, message = "motivation : 2000 caractères maximum")
    private String motivation;
}
