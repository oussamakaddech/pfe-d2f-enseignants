package esprit.pfe.auth.config;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import esprit.pfe.auth.security.DefaultCredentialsManager;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

@Configuration
public class DataSeederConfig {

    @Bean
    CommandLineRunner seedDefaultAdmin(UserRepository userRepository,
                                       RoleRepository roleRepository,
                                       PasswordEncoder passwordEncoder,
                                       DefaultCredentialsManager credentialsManager) {
        return args -> {
            Role adminRole = initializeRoles(roleRepository);
            String defaultUsername = credentialsManager.getDefaultAdminUsername();
            String defaultPassword = credentialsManager.getDefaultAdminPassword();

            userRepository.findByUsername(defaultUsername).ifPresentOrElse(
                existing -> updateExistingAdmin(userRepository, existing, adminRole, defaultPassword, passwordEncoder, credentialsManager),
                () -> createNewAdmin(userRepository, adminRole, defaultUsername, defaultPassword, passwordEncoder, credentialsManager)
            );
        };
    }

    private Role initializeRoles(RoleRepository roleRepository) {
        Role adminRole = roleRepository.findByName(ERole.ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(ERole.ADMIN)));
        ensureRoleExists(roleRepository, ERole.CUP);
        ensureRoleExists(roleRepository, ERole.ENSEIGNANT);
        ensureRoleExists(roleRepository, ERole.FORMATEUR);
        return adminRole;
    }

    private void ensureRoleExists(RoleRepository roleRepository, ERole roleName) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            roleRepository.save(new Role(roleName));
        }
    }

    private void updateExistingAdmin(UserRepository userRepository, User existing, Role adminRole, String defaultPassword,
                                   PasswordEncoder passwordEncoder, DefaultCredentialsManager credentialsManager) {
        if (!passwordEncoder.matches(defaultPassword, existing.getPassword())) {
            existing.setPassword(passwordEncoder.encode(defaultPassword));
            existing.setRoles(Set.of(adminRole));
            updateAdminProfile(existing, credentialsManager);
            userRepository.save(existing);
        }
    }

    private void updateAdminProfile(User admin, DefaultCredentialsManager credentialsManager) {
        if (admin.getFirstName() == null || admin.getFirstName().isBlank()) {
            admin.setFirstName(credentialsManager.getDefaultAdminFirstName());
        }
        if (admin.getLastName() == null || admin.getLastName().isBlank()) {
            admin.setLastName(credentialsManager.getDefaultAdminLastName());
        }
        if (admin.getPhoneNumber() == null || admin.getPhoneNumber().isBlank()) {
            admin.setPhoneNumber(credentialsManager.getDefaultAdminPhone());
        }
        if (admin.getEmail() == null || admin.getEmail().isBlank()) {
            admin.setEmail(credentialsManager.getDefaultAdminEmail());
        }
    }

    private void createNewAdmin(UserRepository userRepository, Role adminRole, String defaultUsername,
                               String defaultPassword, PasswordEncoder passwordEncoder,
                               DefaultCredentialsManager credentialsManager) {
        User admin = new User(
                defaultUsername,
                credentialsManager.getDefaultAdminFirstName(),
                credentialsManager.getDefaultAdminLastName(),
                credentialsManager.getDefaultAdminPhone(),
                credentialsManager.getDefaultAdminEmail(),
                passwordEncoder.encode(defaultPassword)
        );
        admin.setRoles(Set.of(adminRole));
        userRepository.save(admin);
    }
}
