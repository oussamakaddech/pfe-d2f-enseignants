package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import esprit.pfe.auth.repositories.UserSpecifications;


import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.error.ConflictException;
import esprit.pfe.auth.error.LoginException;
import esprit.pfe.auth.error.ResourceNotFoundException;
import esprit.pfe.auth.payload.request.AccountSummaryQuery;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import esprit.pfe.auth.payload.response.AccountSummaryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional(readOnly = true)
    public List<AccountSummaryDTO> getAccountSummaries(AccountSummaryQuery query) {
        AccountSummaryQuery q = (query != null) ? query : new AccountSummaryQuery();
        List<User> users = userRepository.findAll(
                UserSpecifications.build(q.getUserIds(), q.getRole(), q.getActive()));
        return users.stream().map(AccountSummaryDTO::from).toList();
    }

    @Override
    @Transactional
    public User createAccount(SignupRequest request, String roleName) {
        // Conflits → 409 (sémantique REST)
        if (request.getId() != null && !request.getId().isBlank()
                && userRepository.existsById(request.getId())) {
            throw new ConflictException("Error: ID is already taken!");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Error: Username is already taken!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Error: Email is already in use!");
        }

        User user = new User(
                request.getUsername(),
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber(),
                request.getEmail(),
                encoder.encode(request.getPassword()));
        user.setId(request.getId());

        // Contexte admin (ACCOUNT_CREATE) : le rôle demandé est honoré.
        Set<Role> roles = new HashSet<>();
        roles.add(resolveRole(roleName));
        user.setRoles(roles);
        return userRepository.save(user);
    }

    /**
     * Résout un nom de rôle (ex. "CUP", "Enseignant:1") en entité {@link Role}.
     * Rôle vide/null → ENSEIGNANT par défaut. Rôle inconnu → 400.
     */
    private Role resolveRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return roleRepository.findByName(ERole.ENSEIGNANT)
                    .orElseThrow(() -> new BadRequestException("Default role 'ENSEIGNANT' not found."));
        }
        String roleNamePart = roleName.split(":")[0].trim().toUpperCase();
        ERole eRole;
        try {
            eRole = ERole.valueOf(roleNamePart);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid role: " + roleName);
        }
        return roleRepository.findByName(eRole)
                .orElseThrow(() -> new BadRequestException("Role not found: " + roleName));
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
    @Transactional
    public void deleteAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
        // Obfuscate unique fields before soft-deleting so the email/username
        // can be reused immediately. The deleted_at timestamp preserves the audit trail.
        // email VARCHAR(50): "d_" + UUID(36) + "@del.x" = 44 chars ✓
        // username VARCHAR(20): "del_" + UUID truncated to 20 chars ✓
        String shortId = userId.replace("-", "").substring(0, 12);
        user.setEmail("d_" + userId + "@del.x");
        user.setUsername("del_" + shortId);
        userRepository.save(user);
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

        // Update role if provided (réutilise la résolution commune)
        if (roleName != null && !roleName.isBlank()) {
            Set<Role> roles = new HashSet<>();
            roles.add(resolveRole(roleName));
            user.setRoles(roles);
        }

        return userRepository.save(user);
    }

}
