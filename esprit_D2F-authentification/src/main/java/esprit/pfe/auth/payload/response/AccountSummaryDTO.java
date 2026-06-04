package esprit.pfe.auth.payload.response;

import esprit.pfe.auth.entities.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vue allégée d'un compte, destinée à l'enrichissement inter-service
 * (formation → auth) pour la page de gestion unifiée. N'expose JAMAIS le
 * hash du mot de passe ni d'autres données sensibles.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(name = "AccountSummaryDTO", description = "Résumé public d'un compte (sans secret)")
public class AccountSummaryDTO {

    @Schema(description = "Identifiant du compte (auth.users.id)", example = "9d1f...")
    private String userId;

    @Schema(description = "Nom d'utilisateur", example = "ktrabelsi")
    private String username;

    @Schema(description = "Email", example = "k.trabelsi@esprit.tn")
    private String email;

    @Schema(description = "Prénom", example = "Karim")
    private String firstName;

    @Schema(description = "Nom", example = "Trabelsi")
    private String lastName;

    @Schema(description = "Rôle principal",
            example = "ENSEIGNANT",
            allowableValues = {"ADMIN", "CUP", "D2F", "ENSEIGNANT", "FORMATEUR", "ANIMATEUR",
                    "CHEF_DEPARTEMENT", "RESPONSABLE_DOSSIER"})
    private String role;

    @Schema(description = "Compte actif (true = non désactivé)", example = "true")
    private boolean active;

    public static AccountSummaryDTO from(User user) {
        String roleName = (user.getRoles() != null)
                ? user.getRoles().stream().findFirst().map(r -> r.getName().name()).orElse(null)
                : null;
        // disabled == TRUE → compte désactivé. null/false → actif.
        boolean active = !Boolean.TRUE.equals(user.getDisabled());
        return AccountSummaryDTO.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(roleName)
                .active(active)
                .build();
    }
}
