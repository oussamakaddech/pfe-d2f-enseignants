package esprit.pfe.auth;

import esprit.pfe.auth.Entities.ERole;
import esprit.pfe.auth.Entities.Role;
import esprit.pfe.auth.Entities.User;
import esprit.pfe.auth.Repositories.RoleRepository;
import esprit.pfe.auth.Repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;


@SpringBootApplication
//@EnableDiscoveryClient
public class AuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthApplication.class, args);
    }

    @Bean
    CommandLineRunner seedDefaultAdmin(UserRepository userRepository,
                                       RoleRepository roleRepository,
                                       PasswordEncoder passwordEncoder) {
        return args -> {
            Role adminRole = roleRepository.findByName(ERole.admin)
                    .orElseGet(() -> roleRepository.save(new Role(ERole.admin)));
            roleRepository.findByName(ERole.CUP)
                    .orElseGet(() -> roleRepository.save(new Role(ERole.CUP)));
            roleRepository.findByName(ERole.D2F)
                    .orElseGet(() -> roleRepository.save(new Role(ERole.D2F)));
            roleRepository.findByName(ERole.Formateur)
                    .orElseGet(() -> roleRepository.save(new Role(ERole.Formateur)));

            userRepository.findByUsername("admin").ifPresentOrElse(existing -> {
                if (!passwordEncoder.matches("admin123", existing.getPassword())) {
                    existing.setPassword(passwordEncoder.encode("admin123"));
                    existing.setRoles(Set.of(adminRole));
                    if (existing.getFirstName() == null || existing.getFirstName().isBlank()) {
                        existing.setFirstName("System");
                    }
                    if (existing.getLastName() == null || existing.getLastName().isBlank()) {
                        existing.setLastName("Admin");
                    }
                    if (existing.getPhoneNumber() == null || existing.getPhoneNumber().isBlank()) {
                        existing.setPhoneNumber("00000000");
                    }
                    if (existing.getEmail() == null || existing.getEmail().isBlank()) {
                        existing.setEmail("admin@d2f.local");
                    }
                    userRepository.save(existing);
                }
            }, () -> {
                User admin = new User(
                        "admin",
                        "System",
                        "Admin",
                        "00000000",
                        "admin@d2f.local",
                        passwordEncoder.encode("admin123")
                );
                admin.setRoles(Set.of(adminRole));
                userRepository.save(admin);
            });
        };
    }

}
