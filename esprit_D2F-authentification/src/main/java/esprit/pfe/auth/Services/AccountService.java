package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AccountService {

    Page<User> listAccounts(Pageable pageable);

    void banAccount(String userName);

    void enableAccount(String userName);

    User getPrincipal(String userName);

    String editProfile(String userName, EditProfileRequest editProfileRequest);

    String updatePassword(String userName, UpdatePasswordRequest updatePasswordRequest);
    User getPrincipalByUsername(String username);
    void deleteAccount(String userId);
    User updateAccount(String userId, EditProfileRequest editProfileRequest, String roleName);

}
