package esprit.pfe.auth.config;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import esprit.pfe.auth.security.DefaultCredentialsManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataSeederConfigTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private DefaultCredentialsManager credentialsManager;

    @InjectMocks
    private DataSeederConfig dataSeederConfig;

    @Test
    void seedDefaultAdmin_WhenUserNotExists_ShouldCreateNewAdmin() throws Exception {
        // Arrange
        when(roleRepository.findByName(ERole.ADMIN)).thenReturn(Optional.of(new Role(ERole.ADMIN)));
        when(roleRepository.findByName(ERole.CUP)).thenReturn(Optional.of(new Role(ERole.CUP)));
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        when(roleRepository.findByName(ERole.FORMATEUR)).thenReturn(Optional.of(new Role(ERole.FORMATEUR)));

        when(credentialsManager.getDefaultAdminUsername()).thenReturn("admin");
        when(credentialsManager.getDefaultAdminPassword()).thenReturn("pass");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());

        CommandLineRunner runner = dataSeederConfig.seedDefaultAdmin(userRepository, roleRepository, passwordEncoder, credentialsManager);

        // Act
        runner.run();

        // Assert
        verify(userRepository).save(any(User.class));
    }

    @Test
    void seedDefaultAdmin_WhenUserExistsButPasswordDiffers_ShouldUpdateAdmin() throws Exception {
        // Arrange
        User existingAdmin = new User();
        existingAdmin.setUsername("admin");
        existingAdmin.setPassword("old-pass");

        when(roleRepository.findByName(any())).thenReturn(Optional.of(new Role(ERole.ADMIN)));
        when(credentialsManager.getDefaultAdminUsername()).thenReturn("admin");
        when(credentialsManager.getDefaultAdminPassword()).thenReturn("new-pass");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(existingAdmin));
        when(passwordEncoder.matches("new-pass", "old-pass")).thenReturn(false);
        when(passwordEncoder.encode("new-pass")).thenReturn("encoded-new-pass");

        CommandLineRunner runner = dataSeederConfig.seedDefaultAdmin(userRepository, roleRepository, passwordEncoder, credentialsManager);

        // Act
        runner.run();

        // Assert
        verify(userRepository).save(existingAdmin);
    }

    @Test
    void seedDefaultAdmin_WhenRolesNotExist_ShouldCreateRoles() throws Exception {
        // Arrange
        when(roleRepository.findByName(any())).thenReturn(Optional.empty());
        when(roleRepository.save(any(Role.class))).thenAnswer(i -> i.getArguments()[0]);
        when(credentialsManager.getDefaultAdminUsername()).thenReturn("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());

        CommandLineRunner runner = dataSeederConfig.seedDefaultAdmin(userRepository, roleRepository, passwordEncoder, credentialsManager);

        // Act
        runner.run();

        // Assert
        verify(roleRepository, times(4)).save(any(Role.class));
    }

    @Test
    void seedDefaultAdmin_WhenPasswordMatches_ShouldNotUpdate() throws Exception {
        // Arrange
        User existingAdmin = new User();
        existingAdmin.setUsername("admin");
        existingAdmin.setPassword("pass");

        when(roleRepository.findByName(any())).thenReturn(Optional.of(new Role(ERole.ADMIN)));
        when(credentialsManager.getDefaultAdminUsername()).thenReturn("admin");
        when(credentialsManager.getDefaultAdminPassword()).thenReturn("pass");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(existingAdmin));
        when(passwordEncoder.matches("pass", "pass")).thenReturn(true);

        CommandLineRunner runner = dataSeederConfig.seedDefaultAdmin(userRepository, roleRepository, passwordEncoder, credentialsManager);

        // Act
        runner.run();

        // Assert
        verify(userRepository, never()).save(any());
    }
}
