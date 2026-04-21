package esprit.pfe.auth.Services;

import esprit.pfe.auth.Entities.ERole;
import esprit.pfe.auth.Entities.Role;
import esprit.pfe.auth.Entities.User;
import esprit.pfe.auth.Repositories.RoleRepository;
import esprit.pfe.auth.Repositories.UserRepository;


import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class AccountServiceImpl implements AccountService {

    @Autowired
    UserRepository userRepository;
    @Autowired
    RoleRepository roleRepository;
    @Autowired
    private PasswordEncoder encoder;
    @Override
    public List<User> listAccounts() {
        return this.userRepository.findAll();
    }

    @Override
    public void banAccount(String userName) {
        User user = this.userRepository.findByUsername(userName).get();
        user.setDisabled(true);
        this.userRepository.save(user);
    }

    @Override
    public void enableAccount(String userName) {
        User user = this.userRepository.findByUsername(userName).get();
        user.setDisabled(false);
        this.userRepository.save(user);
    }

    @Override
    public User getPrincipal(String userName) {
        return this.userRepository.findByUsername(userName).get();
    }

    @Override
    public String editProfile(String userName, EditProfileRequest editProfileRequest) {
        User user = userRepository.findByUsername(userName)
                .orElseThrow(() -> new BadRequestException("User not found"));
        String newEmail = editProfileRequest.getEmail();
        // Vérifier l'unicité de l'email seulement si modifié et appartenant à un autre utilisateur
        Optional<User> byEmail = userRepository.findByEmail(newEmail);
        if (byEmail.isPresent() && !byEmail.get().getUsername().equals(userName)) {
            throw new BadRequestException("Email address already in use");
        }
        user.setFirstName(editProfileRequest.getFirstName());
        user.setLastName(editProfileRequest.getLastName());
        user.setEmail(newEmail);
        user.setPhoneNumber(editProfileRequest.getPhoneNumber());
        userRepository.save(user);
        return "Profile updated";
    }

    @Override
    public String updatePassword(String userName, UpdatePasswordRequest updatePasswordRequest) {
        if(!updatePasswordRequest.getNewPassword().equals(updatePasswordRequest.getConfirmation()))
            throw new BadRequestException("Confirm your password again");
        User user = this.userRepository.findByUsername(userName).get();
        user.setPassword(encoder.encode(updatePasswordRequest.getNewPassword()));
        this.userRepository.save(user);
        return "Password updated";
    }

    private void checkIfEmailAddressExist(String emailAddress) {
        if (this.userRepository.existsByEmail(emailAddress))
            throw new BadRequestException("Email address already in use");
    }
    @Override
    public User getPrincipalByUsername(String username) {
        return this.userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));
    }

    @Override
    public void deleteAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));
        userRepository.delete(user);
    }

    @Override
    public User updateAccount(String userId, EditProfileRequest editProfileRequest, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        // Update profile fields
        if (editProfileRequest.getFirstName() != null) {
            user.setFirstName(editProfileRequest.getFirstName());
        }
        if (editProfileRequest.getLastName() != null) {
            user.setLastName(editProfileRequest.getLastName());
        }
        if (editProfileRequest.getEmail() != null) {
            Optional<User> byEmail = userRepository.findByEmail(editProfileRequest.getEmail());
            if (byEmail.isPresent() && !byEmail.get().getId().equals(userId)) {
                throw new BadRequestException("Email address already in use");
            }
            user.setEmail(editProfileRequest.getEmail());
        }
        if (editProfileRequest.getPhoneNumber() != null) {
            user.setPhoneNumber(editProfileRequest.getPhoneNumber());
        }

        // Update role if provided
        if (roleName != null && !roleName.isBlank()) {
            ERole eRole = ERole.valueOf(roleName);
            Role newRole = roleRepository.findByName(eRole)
                    .orElseThrow(() -> new BadRequestException("Role not found: " + roleName));
            Set<Role> roles = new HashSet<>();
            roles.add(newRole);
            user.setRoles(roles);
        }

        return userRepository.save(user);
    }

}
