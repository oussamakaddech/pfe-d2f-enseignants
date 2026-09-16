package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Corps envoyé au service auth (POST /api/v1/account/create-account) lors de la
 * création orchestrée « compte + fiche enseignant » en un seul appel.
 *
 * <p>Réplique le {@code SignupRequest} d'auth (la validation stricte y est
 * appliquée côté auth). On ne déclare ici que les champs nécessaires.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountCreationRequest {
    private String id;
    private String username;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String email;
    private String password;
}
