package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.error.BadRequestException;
import esprit.pfe.auth.error.LoginException;
import esprit.pfe.auth.error.ResourceNotFoundException;
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
import esprit.pfe.auth.error.ConflictException;
import esprit.pfe.auth.payload.request.AccountSummaryQuery;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.response.AccountSummaryDTO;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.domain.Specification;

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
    void testGetPrincipal_UserNotFound() {
        // Arrange
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert — JWT's user deleted → 401 LoginException (not 400 BadRequest)
        LoginException exception = assertThrows(
            LoginException.class,
            () -> accountService.getPrincipal("nonexistent")
        );
        assertEquals("User not found", exception.getMessage());
        verify(userRepository, times(1)).findByUsername("nonexistent");
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

        // Act & Assert — JWT's user no longer exists → 401 LoginException
        LoginException exception = assertThrows(
            LoginException.class,
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
    void testUpdatePassword_UserNotFound() {
        // Arrange — mismatch check happens before the DB lookup, so use matching passwords
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert — JWT's user deleted → 401 LoginException
        LoginException exception = assertThrows(
            LoginException.class,
            () -> accountService.updatePassword("nonexistent", updatePasswordRequest)
        );
        assertEquals("User not found", exception.getMessage());
        verify(userRepository, times(1)).findByUsername("nonexistent");
        verify(userRepository, never()).save(any(User.class));
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

        // Act & Assert — admin lookup of non-existent user → 404 ResourceNotFoundException
        ResourceNotFoundException exception = assertThrows(
            ResourceNotFoundException.class,
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

        // Act & Assert — deleting non-existent resource → 404 ResourceNotFoundException
        ResourceNotFoundException exception = assertThrows(
            ResourceNotFoundException.class,
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
    void testUpdateAccount_UserNotFound() {
        // Arrange
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert — admin update on non-existent resource → 404 ResourceNotFoundException
        ResourceNotFoundException exception = assertThrows(
            ResourceNotFoundException.class,
            () -> accountService.updateAccount("nonexistent", editProfileRequest, null)
        );
        assertEquals("User not found", exception.getMessage());
        verify(userRepository, times(1)).findById("nonexistent");
        verify(userRepository, never()).save(any(User.class));
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
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> accountService.updateAccount("test123", editProfileRequest, "INVALID_ROLE")
        );
        assertEquals("Invalid role: INVALID_ROLE", exception.getMessage());
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

    // ── listAccounts(Pageable, boolean) ───────────────────────────────────────

    @Test
    void testListAccounts_IncludeDeleted_True_UsesIncludingDeletedRepo() {
        Page<User> page = new PageImpl<>(List.of(testUser));
        when(userRepository.findAllIncludingDeleted(any(Pageable.class))).thenReturn(page);

        Page<User> result = accountService.listAccounts(Pageable.unpaged(), true);

        assertEquals(1, result.getContent().size());
        verify(userRepository).findAllIncludingDeleted(any(Pageable.class));
        verify(userRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    void testListAccounts_IncludeDeleted_False_UsesStandardRepo() {
        Page<User> page = new PageImpl<>(List.of(testUser));
        when(userRepository.findAll(any(Pageable.class))).thenReturn(page);

        Page<User> result = accountService.listAccounts(Pageable.unpaged(), false);

        assertEquals(1, result.getContent().size());
        verify(userRepository).findAll(any(Pageable.class));
        verify(userRepository, never()).findAllIncludingDeleted(any(Pageable.class));
    }

    // ── getAccountSummaries ───────────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void testGetAccountSummaries_NullQuery_UsesEmptyQuery() {
        when(userRepository.findAll(any(Specification.class))).thenReturn(List.of(testUser));

        List<AccountSummaryDTO> result = accountService.getAccountSummaries(null);

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals("ADMIN", result.get(0).getRole());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testGetAccountSummaries_WithQuery_FiltersApplied() {
        AccountSummaryQuery query = new AccountSummaryQuery(List.of("test123"), "ADMIN", true);
        when(userRepository.findAll(any(Specification.class))).thenReturn(List.of(testUser));

        List<AccountSummaryDTO> result = accountService.getAccountSummaries(query);

        assertFalse(result.isEmpty());
        verify(userRepository).findAll(any(Specification.class));
    }

    // ── createAccount ─────────────────────────────────────────────────────────

    private SignupRequest buildSignupRequest(String username, String email, String id) {
        SignupRequest req = new SignupRequest();
        req.setId(id);
        req.setUsername(username);
        req.setFirstName("Prénom");
        req.setLastName("Nom");
        req.setPhoneNumber("0600000000");
        req.setEmail(email);
        req.setPassword("password1");
        return req;
    }

    @Test
    void testCreateAccount_Success_ExplicitRole() {
        SignupRequest req = buildSignupRequest("newuser", "new@test.com", null);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(encoder.encode("password1")).thenReturn("encoded");
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        when(userRepository.saveAndFlush(any(User.class))).thenReturn(testUser);

        User result = accountService.createAccount(req, null);

        assertNotNull(result);
        verify(userRepository).saveAndFlush(any(User.class));
    }

    @Test
    void testCreateAccount_WithId_NoConflict_Succeeds() {
        SignupRequest req = buildSignupRequest("newuser2", "new2@test.com", "custom-id");
        when(userRepository.existsById("custom-id")).thenReturn(false);
        when(userRepository.existsByUsername("newuser2")).thenReturn(false);
        when(userRepository.existsByEmail("new2@test.com")).thenReturn(false);
        when(encoder.encode("password1")).thenReturn("encoded");
        when(roleRepository.findByName(ERole.ADMIN)).thenReturn(Optional.of(testRole));
        when(userRepository.saveAndFlush(any(User.class))).thenReturn(testUser);

        User result = accountService.createAccount(req, "ADMIN");

        assertNotNull(result);
    }

    @Test
    void testCreateAccount_IdConflict_ThrowsConflictException() {
        SignupRequest req = buildSignupRequest("u", "u@t.com", "taken-id");
        when(userRepository.existsById("taken-id")).thenReturn(true);

        assertThrows(ConflictException.class, () -> accountService.createAccount(req, null));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void testCreateAccount_UsernameConflict_ThrowsConflictException() {
        SignupRequest req = buildSignupRequest("existinguser", "fresh@test.com", null);
        when(userRepository.existsByUsername("existinguser")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> accountService.createAccount(req, null));
        assertTrue(ex.getErrorMessage().contains("Username"));
    }

    @Test
    void testCreateAccount_EmailConflict_ThrowsConflictException() {
        SignupRequest req = buildSignupRequest("freshuser", "existing@test.com", null);
        when(userRepository.existsByUsername("freshuser")).thenReturn(false);
        when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> accountService.createAccount(req, null));
        assertTrue(ex.getErrorMessage().contains("Email"));
    }

    @Test
    void testCreateAccount_DataIntegrityViolation_Email_ThrowsConflictException() {
        SignupRequest req = buildSignupRequest("u3", "u3@t.com", null);
        when(userRepository.existsByUsername("u3")).thenReturn(false);
        when(userRepository.existsByEmail("u3@t.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("enc");
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate entry email already exists"));

        ConflictException ex = assertThrows(ConflictException.class, () -> accountService.createAccount(req, null));
        assertTrue(ex.getErrorMessage().contains("Email"));
    }

    @Test
    void testCreateAccount_DataIntegrityViolation_Username_ThrowsConflictException() {
        SignupRequest req = buildSignupRequest("u4", "u4@t.com", null);
        when(userRepository.existsByUsername("u4")).thenReturn(false);
        when(userRepository.existsByEmail("u4@t.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("enc");
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value username constraint"));

        ConflictException ex = assertThrows(ConflictException.class, () -> accountService.createAccount(req, null));
        assertTrue(ex.getErrorMessage().contains("Username"));
    }

    @Test
    void testCreateAccount_DataIntegrityViolation_Other_ThrowsGenericConflict() {
        SignupRequest req = buildSignupRequest("u5", "u5@t.com", null);
        when(userRepository.existsByUsername("u5")).thenReturn(false);
        when(userRepository.existsByEmail("u5@t.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("enc");
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("some other constraint"));

        ConflictException ex = assertThrows(ConflictException.class, () -> accountService.createAccount(req, null));
        assertTrue(ex.getErrorMessage().contains("conflicts"));
    }

    @Test
    void testCreateAccount_DataIntegrityViolation_NullCauseMessage_ThrowsGenericConflict() {
        SignupRequest req = buildSignupRequest("u6", "u6@t.com", null);
        when(userRepository.existsByUsername("u6")).thenReturn(false);
        when(userRepository.existsByEmail("u6@t.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("enc");
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        DataIntegrityViolationException ex = new DataIntegrityViolationException("outer", new RuntimeException((String) null));
        when(userRepository.saveAndFlush(any(User.class))).thenThrow(ex);

        ConflictException conflict = assertThrows(ConflictException.class, () -> accountService.createAccount(req, null));
        assertTrue(conflict.getErrorMessage().contains("conflicts"));
    }

    @Test
    void testCreateAccount_RoleWithColon_ExtractsRolePart() {
        SignupRequest req = buildSignupRequest("u7", "u7@t.com", null);
        when(userRepository.existsByUsername("u7")).thenReturn(false);
        when(userRepository.existsByEmail("u7@t.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("enc");
        when(roleRepository.findByName(ERole.CUP)).thenReturn(Optional.of(new Role(ERole.CUP)));
        when(userRepository.saveAndFlush(any(User.class))).thenReturn(testUser);

        User result = accountService.createAccount(req, "CUP:2");

        assertNotNull(result);
        verify(roleRepository).findByName(ERole.CUP);
    }

    @Test
    void testCreateAccount_DefaultRoleNotFound_ThrowsBadRequest() {
        SignupRequest req = buildSignupRequest("u8", "u8@t.com", null);
        when(userRepository.existsByUsername("u8")).thenReturn(false);
        when(userRepository.existsByEmail("u8@t.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("enc");
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> accountService.createAccount(req, null));
    }

    // ── banAccount / enableAccount ────────────────────────────────────────────

    @Test
    void testBanAccount_UserNotFound_ThrowsBadRequest() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        assertThrows(BadRequestException.class, () -> accountService.banAccount("ghost"));
    }

    @Test
    void testEnableAccount_UserNotFound_ThrowsBadRequest() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        assertThrows(BadRequestException.class, () -> accountService.enableAccount("ghost"));
    }

    // ── userExistsById ────────────────────────────────────────────────────────

    @Test
    void testUserExistsById_Exists_ReturnsTrue() {
        when(userRepository.existsById("test123")).thenReturn(true);
        assertTrue(accountService.userExistsById("test123"));
    }

    @Test
    void testUserExistsById_NotExists_ReturnsFalse() {
        when(userRepository.existsById("nobody")).thenReturn(false);
        assertFalse(accountService.userExistsById("nobody"));
    }

    // ── permanentDeleteAccount ────────────────────────────────────────────────

    @Test
    void testPermanentDeleteAccount_Success_DeletesRecord() {
        when(userRepository.findByIdIncludingDeleted("test123")).thenReturn(Optional.of(testUser));
        doNothing().when(userRepository).deletePermanentById("test123");

        accountService.permanentDeleteAccount("test123");

        verify(userRepository).deletePermanentById("test123");
    }

    @Test
    void testPermanentDeleteAccount_UserNotFound_ThrowsResourceNotFoundException() {
        when(userRepository.findByIdIncludingDeleted("ghost")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> accountService.permanentDeleteAccount("ghost"));
        verify(userRepository, never()).deletePermanentById(anyString());
    }
}
