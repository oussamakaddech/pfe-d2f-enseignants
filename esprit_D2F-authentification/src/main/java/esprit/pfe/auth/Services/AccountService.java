package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;


import java.util.List;

public interface AccountService {

    List<User> listAccounts();

    void banAccount(String userName);

    void enableAccount(String userName);

    User getPrincipal(String userName);

    String editProfile(String userName, EditProfileRequest editProfileRequest);

    String updatePassword(String userName, UpdatePasswordRequest updatePasswordRequest);
    User getPrincipalByUsername(String username);
    void deleteAccount(String userId);
    User updateAccount(String userId, EditProfileRequest editProfileRequest, String roleName);

}
