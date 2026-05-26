package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;


import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.error.LoginException;
import esprit.pfe.auth.error.ResourceNotFoundException;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class AccountServiceImpl implements AccountService {

    private static final String USER_NOT_FOUND = "User not found";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder encoder;

    public AccountServiceImpl(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder encoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.encoder = encoder;
    }
    @Override
    public Page<User> listAccounts(Pageable pageable) {
        return this.userRepository.findAll(pageable);
    }

    @Override
    public void banAccount(String userName) {
        User user = this.userRepository.findByUsername(userName)
                .orElseThrow(() -> new BadRequestException(USER_NOT_FOUND));
        user.setDisabled(true);
        this.userRepository.save(user);
    }

    @Override
    public void enableAccount(String userName) {
        User user = this.userRepository.findByUsername(userName)
                .orElseThrow(() -> new BadRequestException(USER_NOT_FOUND));
        user.setDisabled(false);
        this.userRepository.save(user);
    }

    @Override
    public User getPrincipal(String userName) {
        // JWT is valid but the user no longer exists → treat as authentication failure (401)
        return this.userRepository.findByUsername(userName)
                .orElseThrow(() -> new LoginException(USER_NOT_FOUND));
    }

    @Override
    public String editProfile(String userName, EditProfileRequest editProfileRequest) {
        User user = userRepository.findByUsername(userName)
                .orElseThrow(() -> new LoginException(USER_NOT_FOUND));
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
        User user = this.userRepository.findByUsername(userName)
                .orElseThrow(() -> new LoginException(USER_NOT_FOUND));
        user.setPassword(encoder.encode(updatePasswordRequest.getNewPassword()));
        this.userRepository.save(user);
        return "Password updated";
    }

    @Override
    public User getPrincipalByUsername(String username) {
        return this.userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
    }

    @Override
    public boolean userExistsById(String userId) {
        return this.userRepository.existsById(userId);
    }

    @Override
    public void deleteAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
        userRepository.delete(user);
    }

    @Override
    public User updateAccount(String userId, EditProfileRequest editProfileRequest, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));

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
            // Parse roleName: handle "Enseignant:1" format or plain "Enseignant"
            String roleNamePart = roleName.split(":")[0].trim().toUpperCase();
            ERole eRole = ERole.valueOf(roleNamePart);
            Role newRole = roleRepository.findByName(eRole)
                    .orElseThrow(() -> new BadRequestException("Role not found: " + roleName));
            Set<Role> roles = new HashSet<>();
            roles.add(newRole);
            user.setRoles(roles);
        }

        return userRepository.save(user);
    }

}
