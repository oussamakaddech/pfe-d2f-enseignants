package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder encoder;

    @InjectMocks
    private AccountServiceImpl accountService;

    private User testUser;
    private Role testRole;
    private EditProfileRequest editProfileRequest;
    private UpdatePasswordRequest updatePasswordRequest;

    @BeforeEach
    void setUp() {
        testRole = new Role(ERole.ADMIN);
        testRole.setId(1);

        testUser = new User();
        testUser.setId("test123");
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setPhoneNumber("1234567890");
        testUser.setDisabled(false);
        Set<Role> roles = new HashSet<>();
        roles.add(testRole);
        testUser.setRoles(roles);

        editProfileRequest = new EditProfileRequest();
        editProfileRequest.setFirstName("Updated");
        editProfileRequest.setLastName("Name");
        editProfileRequest.setEmail("updated@example.com");
        editProfileRequest.setPhoneNumber("0987654321");

        updatePasswordRequest = new UpdatePasswordRequest();
        updatePasswordRequest.setNewPassword("newPassword123");
        updatePasswordRequest.setConfirmation("newPassword123");
    }

    @Test
    void testListAccounts_Success() {
        // Arrange
        List<User> expectedUsers = List.of(testUser);
        Page<User> expectedPage = new PageImpl<>(expectedUsers);
        when(userRepository.findAll(any(Pageable.class))).thenReturn(expectedPage);

        // Act
        Page<User> result = accountService.listAccounts(Pageable.unpaged());

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("testuser", result.getContent().get(0).getUsername());
        verify(userRepository, times(1)).findAll(any(Pageable.class));
    }

    @Test
    void testBanAccount_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        accountService.banAccount("testuser");

        // Assert
        assertTrue(testUser.getDisabled());
        verify(userRepository, times(1)).findByUsername("testuser");
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testEnableAccount_Success() {
        // Arrange
        testUser.setDisabled(true);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        accountService.enableAccount("testuser");

        // Assert
        assertFalse(testUser.getDisabled());
        verify(userRepository, times(1)).findByUsername("testuser");
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testGetPrincipal_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        // Act
        User result = accountService.getPrincipal("testuser");

        // Assert
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    void testEditProfile_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("updated@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        String result = accountService.editProfile("testuser", editProfileRequest);

        // Assert
        assertEquals("Profile updated", result);
        assertEquals("Updated", testUser.getFirstName());
        assertEquals("Name", testUser.getLastName());
        assertEquals("updated@example.com", testUser.getEmail());
        assertEquals("0987654321", testUser.getPhoneNumber());
        verify(userRepository, times(1)).findByUsername("testuser");
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testEditProfile_UserNotFound() {
        // Arrange
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.editProfile("nonexistent", editProfileRequest)
        );
        assertEquals("User not found", exception.getMessage());
        verify(userRepository, times(1)).findByUsername("nonexistent");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testEditProfile_EmailAlreadyInUse() {
        // Arrange
        User anotherUser = new User();
        anotherUser.setId("another123");
        anotherUser.setUsername("anotheruser");
        anotherUser.setEmail("updated@example.com");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("updated@example.com")).thenReturn(Optional.of(anotherUser));

        // Act & Assert
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.editProfile("testuser", editProfileRequest)
        );
        assertEquals("Email address already in use", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdatePassword_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(encoder.encode("newPassword123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        String result = accountService.updatePassword("testuser", updatePasswordRequest);

        // Assert
        assertEquals("Password updated", result);
        assertEquals("encodedPassword", testUser.getPassword());
        verify(userRepository, times(1)).findByUsername("testuser");
        verify(encoder, times(1)).encode("newPassword123");
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testUpdatePassword_PasswordMismatch() {
        // Arrange
        updatePasswordRequest.setConfirmation("differentPassword");

        // Act & Assert
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.updatePassword("testuser", updatePasswordRequest)
        );
        assertEquals("Confirm your password again", exception.getMessage());
        verify(userRepository, never()).findByUsername(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testGetPrincipalByUsername_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        // Act
        User result = accountService.getPrincipalByUsername("testuser");

        // Assert
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    void testGetPrincipalByUsername_UserNotFound() {
        // Arrange
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.getPrincipalByUsername("nonexistent")
        );
        assertEquals("User not found", exception.getMessage());
        verify(userRepository, times(1)).findByUsername("nonexistent");
    }

    @Test
    void testDeleteAccount_Success() {
        // Arrange
        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));
        doNothing().when(userRepository).delete(testUser);

        // Act
        accountService.deleteAccount("test123");

        // Assert
        verify(userRepository, times(1)).findById("test123");
        verify(userRepository, times(1)).delete(testUser);
    }

    @Test
    void testDeleteAccount_UserNotFound() {
        // Arrange
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.deleteAccount("nonexistent")
        );
        assertEquals("User not found", exception.getMessage());
        verify(userRepository, times(1)).findById("nonexistent");
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void testUpdateAccount_Success() {
        // Arrange
        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("updated@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName(ERole.ADMIN)).thenReturn(Optional.of(testRole));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        User result = accountService.updateAccount("test123", editProfileRequest, "ADMIN");

        // Assert
        assertNotNull(result);
        assertEquals("Updated", testUser.getFirstName());
        assertEquals("Name", testUser.getLastName());
        assertEquals("updated@example.com", testUser.getEmail());
        assertEquals("0987654321", testUser.getPhoneNumber());
        assertEquals(1, testUser.getRoles().size());
        assertTrue(testUser.getRoles().contains(testRole));
        verify(userRepository, times(1)).findById("test123");
        verify(roleRepository, times(1)).findByName(ERole.ADMIN);
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testUpdateAccount_EmailAlreadyInUse() {
        // Arrange
        User anotherUser = new User();
        anotherUser.setId("another123");
        anotherUser.setEmail("updated@example.com");

        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("updated@example.com")).thenReturn(Optional.of(anotherUser));

        // Act & Assert
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.updateAccount("test123", editProfileRequest, null)
        );
        assertEquals("Email address already in use", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateAccount_RoleNotFound() {
        // Arrange
        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("updated@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName(ERole.ADMIN)).thenReturn(Optional.empty());

        // Act & Assert
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.updateAccount("test123", editProfileRequest, "ADMIN")
        );
        assertTrue(exception.getMessage().contains("Role not found"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateAccount_PartialUpdate() {
        // Arrange
        EditProfileRequest partialRequest = new EditProfileRequest();
        partialRequest.setFirstName("Partial");
        // Other fields are null

        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        User result = accountService.updateAccount("test123", partialRequest, null);

        // Assert
        assertNotNull(result);
        assertEquals("Partial", testUser.getFirstName());
        // Other fields should remain unchanged
        assertEquals("User", testUser.getLastName());
        assertEquals("test@example.com", testUser.getEmail());
        assertEquals("1234567890", testUser.getPhoneNumber());
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testUpdateAccount_InvalidRole() {
        // Arrange
        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));

        // Act & Assert
        assertThrows(
            IllegalArgumentException.class,
            () -> accountService.updateAccount("test123", editProfileRequest, "INVALID_ROLE")
        );
    }

    @Test
    void testEditProfile_SameEmail() {
        // Arrange
        editProfileRequest.setEmail("test@example.com"); // Same as current
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        String result = accountService.editProfile("testuser", editProfileRequest);

        // Assert
        assertEquals("Profile updated", result);
        verify(userRepository).save(testUser);
    }

    @Test
    void testUpdateAccount_SameEmail() {
        // Arrange
        editProfileRequest.setEmail("test@example.com");
        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        User result = accountService.updateAccount("test123", editProfileRequest, null);

        // Assert
        assertNotNull(result);
        assertEquals("test@example.com", testUser.getEmail());
        verify(userRepository).save(testUser);
    }

    @Test
    void testUpdateAccount_EmptyRole() {
        // Arrange
        when(userRepository.findById("test123")).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("updated@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        User result = accountService.updateAccount("test123", editProfileRequest, "  ");

        // Assert
        assertNotNull(result);
        verify(roleRepository, never()).findByName(any());
        verify(userRepository).save(testUser);
    }
}
