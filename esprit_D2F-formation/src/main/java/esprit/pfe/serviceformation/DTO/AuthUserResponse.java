package esprit.pfe.serviceformation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Réponse du service auth après création de compte (sous-ensemble du UserDTO
 * d'auth). Seul {@code id} est réellement exploité pour rattacher la fiche
 * enseignant ; les autres champs sont tolérés/ignorés.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AuthUserResponse {
    private String id;
    private String userName;
    private String email;
    private String role;
}
