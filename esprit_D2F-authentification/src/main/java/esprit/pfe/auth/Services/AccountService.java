package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AccountService {

    Page<User> listAccounts(Pageable pageable);

    /**
     * Création d'un compte par un administrateur, avec attribution explicite du
     * rôle. Réservé à ACCOUNT_CREATE (admin) — c'est le pendant sécurisé de
     * l'auto-inscription publique qui, elle, force toujours ENSEIGNANT.
     */
    User createAccount(SignupRequest request, String roleName);

    void banAccount(String userName);

    void enableAccount(String userName);

    User getPrincipal(String userName);

    String editProfile(String userName, EditProfileRequest editProfileRequest);

    String updatePassword(String userName, UpdatePasswordRequest updatePasswordRequest);
    User getPrincipalByUsername(String username);
    boolean userExistsById(String userId);
    void deleteAccount(String userId);
    User updateAccount(String userId, EditProfileRequest editProfileRequest, String roleName);

}
