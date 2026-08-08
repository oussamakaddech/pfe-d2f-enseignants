package esprit.pfe.serviceformation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Miroir côté formation du résumé de compte renvoyé par le service auth
 * (POST /api/v1/account/summaries), utilisé pour enrichir les profils unifiés.
 * Tolérant aux champs additionnels (JsonIgnoreProperties) pour résister aux
 * évolutions de l'API auth.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AccountSummaryDTO {
    private String userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private boolean active;
}
