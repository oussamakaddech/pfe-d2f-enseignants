package esprit.pfe.auth.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Payload d'inscription publique (self-service).
 *
 * <p>SÉCURITÉ (audit DSI – BLOCKER #1) : aucun champ {@code role} n'est accepté
 * ici. Toute inscription publique crée un compte ENSEIGNANT (cf.
 * {@code AuthService.registerUser}). L'attribution d'un rôle privilégié
 * (ADMIN, CUP, ANIMATEUR, …) se fait exclusivement via l'endpoint admin
 * {@code PUT /api/v1/account/update/{id}?role=...} (protégé par ACCOUNT_UPDATE).
 */
@Data
public class SignupRequest {
    private String id;

    @NotBlank
    @Size(min = 3, max = 20)
    private String username;

    @NotBlank
    @Size(max = 255)
    private String firstName;

    @NotBlank
    @Size(max = 255)
    private String lastName;

    @NotBlank
    @Size(max = 50)
    private String phoneNumber;

    @NotBlank
    @Size(max = 50)
    @Email
    private String email;

    // Politique de mot de passe (audit DSI) : min 8, au moins une lettre et un chiffre.
    @NotBlank
    @Size(min = 8, max = 72)
    @Pattern(
            regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
            message = "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre")
    private String password;
}
