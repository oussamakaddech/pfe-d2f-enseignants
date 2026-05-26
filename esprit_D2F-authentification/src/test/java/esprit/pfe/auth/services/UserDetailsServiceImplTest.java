package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserDetailsServiceImpl userDetailsService;

    private User testUser;
    private Role testRole;

    @BeforeEach
    void setUp() {
        testRole = new Role(ERole.ADMIN);
        testRole.setId(1);

        testUser = new User();
        testUser.setId("test123");
        testUser.setUsername("testuser");
        testUser.setPassword("encodedPassword");
        testUser.setEmail("test@example.com");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setPhoneNumber("1234567890");
        testUser.setDisabled(false);
        Set<Role> roles = new HashSet<>();
        roles.add(testRole);
        testUser.setRoles(roles);
    }

    @Test
    void testLoadUserByUsername_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(java.util.Optional.of(testUser));

        // Act
        UserDetails userDetails = userDetailsService.loadUserByUsername("testuser");

        // Assert
        assertNotNull(userDetails);
        assertEquals("testuser", userDetails.getUsername());
        assertEquals("encodedPassword", userDetails.getPassword());
        assertTrue(userDetails.isEnabled());
        assertTrue(userDetails.isAccountNonLocked());
        assertTrue(userDetails.isAccountNonExpired());
        assertTrue(userDetails.isCredentialsNonExpired());
        assertEquals(1, userDetails.getAuthorities().size());
        assertTrue(userDetails.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN")));
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    void testLoadUserByUsername_FallsBackToId() {
        // Arrange
        when(userRepository.findByUsername("test123")).thenReturn(java.util.Optional.empty());
        when(userRepository.findById("test123")).thenReturn(java.util.Optional.of(testUser));

        // Act
        UserDetails userDetails = userDetailsService.loadUserByUsername("test123");

        // Assert
        assertNotNull(userDetails);
        assertEquals("testuser", userDetails.getUsername());
        verify(userRepository, times(1)).findByUsername("test123");
        verify(userRepository, times(1)).findById("test123");
    }

    @Test
    void testLoadUserByUsername_UserNotFound() {
        // Arrange
        when(userRepository.findByUsername("nonexistent")).thenReturn(java.util.Optional.empty());
        when(userRepository.findById("nonexistent")).thenReturn(java.util.Optional.empty());

        // Act & Assert
        UsernameNotFoundException exception = assertThrows(
                UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("nonexistent")
        );
        assertTrue(exception.getMessage().contains("User Not Found with username or id: nonexistent"));
        verify(userRepository, times(1)).findByUsername("nonexistent");
        verify(userRepository, times(1)).findById("nonexistent");
    }

    @Test
    void testLoadUserByUsername_DisabledUser() {
        // Arrange
        testUser.setDisabled(true);
        when(userRepository.findByUsername("testuser")).thenReturn(java.util.Optional.of(testUser));

        // Act
        UserDetails userDetails = userDetailsService.loadUserByUsername("testuser");

        // Assert
        assertNotNull(userDetails);
        assertFalse(userDetails.isEnabled());
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    void testLoadUserByUsername_MultipleRoles() {
        // Arrange
        Role role2 = new Role(ERole.CUP);
        role2.setId(2);
        Set<Role> roles = new HashSet<>();
        roles.add(testRole);
        roles.add(role2);
        testUser.setRoles(roles);

        when(userRepository.findByUsername("testuser")).thenReturn(java.util.Optional.of(testUser));

        // Act
        UserDetails userDetails = userDetailsService.loadUserByUsername("testuser");

        // Assert
        assertNotNull(userDetails);
        assertEquals(2, userDetails.getAuthorities().size());
        assertTrue(userDetails.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN")));
        assertTrue(userDetails.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_CUP")));
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    void testSaveCustomer_Success() {
        // Arrange
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        User result = userDetailsService.saveCustomer(testUser);

        // Assert
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository, times(1)).save(testUser);
    }
}
