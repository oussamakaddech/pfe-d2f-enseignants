package esprit.pfe.serviceformation.dto.animator;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réponse à une proposition (accept / reject / manager-reject).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProposalResponseRequest {

    @Size(max = 1000, message = "comment : 1000 caractères maximum")
    private String comment;
}
