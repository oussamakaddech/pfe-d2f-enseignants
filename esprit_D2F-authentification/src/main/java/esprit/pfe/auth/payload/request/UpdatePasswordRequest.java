package esprit.pfe.auth.payload.request;

import lombok.Data;

@Data public class UpdatePasswordRequest {

    /** Mot de passe actuel — vérifié avant tout changement. */
    private String oldPassword;
    private String newPassword;
    private String confirmation;
}
