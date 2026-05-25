package esprit.pfe.auth.security;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.error.CustomExceptionHandler;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.repositories.ConfirmationKeyRepo;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import esprit.pfe.auth.services.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class SecurityControllerTest {

    @Mock
    private EmailService emailService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtEncoder jwtEncoder;

    @Mock
    private ConfirmationKeyRepo confirmationKeyRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private esprit.pfe.auth.services.AuditService auditService;

    private SecurityController securityController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private SignupRequest signupRequest;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        securityController = new SecurityController(
                emailService,
                userRepository,
                roleRepository,
                authenticationManager,
                jwtEncoder,
                confirmationKeyRepo,
                passwordEncoder,
                auditService);

        ReflectionTestUtils.setField(securityController, "mailFrom", "noreply@d2f.local");
        ReflectionTestUtils.setField(securityController, "adminEmail", "admin@d2f.local");
        ReflectionTestUtils.setField(securityController, "cookieSecure", true);
        ReflectionTestUtils.setField(securityController, "lockoutMaxAttempts", 5);
        ReflectionTestUtils.setField(securityController, "lockoutDurationMinutes", 15);

        mockMvc = MockMvcBuilders.standaloneSetup(securityController)
                .setControllerAdvice(new CustomExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();

        signupRequest = new SignupRequest();
        signupRequest.setUsername("newuser");
        signupRequest.setEmail("newuser@example.com");
        signupRequest.setPassword("password123");
        signupRequest.setFirstName("New");
        signupRequest.setLastName("User");
        signupRequest.setRole("admin");
    }

    @Test
    void registerUser_WhenValidRequest_ShouldReturnSuccess() throws Exception {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(ERole.ADMIN)).thenReturn(Optional.of(new Role(ERole.ADMIN)));
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully!"));

        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerUser_WhenUsernameExists_ShouldReturnBadRequest() throws Exception {
        when(userRepository.existsByUsername("newuser")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: Username is already taken!"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void forgotPassword_WhenEmailValid_ShouldSendEmail() throws Exception {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);
        when(confirmationKeyRepo.existsByEmailAddress("test@example.com")).thenReturn(false);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                .param("emailAddress", "test@example.com"))
                .andExpect(status().isOk());

        verify(emailService).send(any());
        verify(confirmationKeyRepo).save(any());
    }

    @Test
    void resetPassword_WhenTokenValid_ShouldReturnSuccess() throws Exception {
        // SECURITE : depuis V12, le controller hashe le token avec SHA-256 avant le lookup
        // BDD. Le mock doit donc matcher sur le HASH du token clair, pas sur le token clair.
        String rawToken = "valid-token";
        String hashed = SecurityController.hashConfirmationToken(rawToken);

        esprit.pfe.auth.entities.ConfirmationKey key = new esprit.pfe.auth.entities.ConfirmationKey();
        key.setEmailAddress("test@example.com");
        key.setToken(hashed);
        key.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        when(confirmationKeyRepo.findByToken(hashed)).thenReturn(Optional.of(key));

        User user = new User();
        user.setEmail("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(anyString())).thenReturn("new-encoded-password");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                .param("token", rawToken)
                .param("newPassword", "newpass123"))
                .andExpect(status().isOk())
            .andExpect(content().string("\"Password changed\""));
    }

    @Test
    void resetPassword_WhenTokenExpired_ShouldReturn410() throws Exception {
        String rawToken = "expired-token";
        String hashed = SecurityController.hashConfirmationToken(rawToken);

        esprit.pfe.auth.entities.ConfirmationKey key = new esprit.pfe.auth.entities.ConfirmationKey();
        key.setEmailAddress("test@example.com");
        key.setToken(hashed);
        key.setExpiresAt(LocalDateTime.now().minusMinutes(5));
        when(confirmationKeyRepo.findByToken(hashed)).thenReturn(Optional.of(key));

        mockMvc.perform(post("/api/v1/auth/reset-password")
                .param("token", rawToken)
                .param("newPassword", "newpass123"))
                .andExpect(status().isGone());
    }

    @Test
    void login_WhenValidCredentials_ShouldReturnJwt() throws Exception {
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        
        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        
        org.springframework.security.oauth2.jwt.Jwt jwt = mock(org.springframework.security.oauth2.jwt.Jwt.class);
        when(jwt.getTokenValue()).thenReturn("mock-jwt-token");
        when(jwtEncoder.encode(any())).thenReturn(jwt);

        mockMvc.perform(post("/api/v1/auth/login")
                .param("username", "testuser")
                .param("password", "password123"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("d2f_auth_token=mock-jwt-token")))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    void login_WhenInvalidCredentials_ShouldReturnUnauthorized() throws Exception {
        when(userRepository.findByUsername("any")).thenReturn(Optional.of(new User()));
        when(authenticationManager.authenticate(any())).thenThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid"));

        mockMvc.perform(post("/api/v1/auth/login")
                .param("username", "any")
                .param("password", "any"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_WhenAccountLocked_ShouldRejectBeforeAuthenticationManager() {
        User user = new User();
        user.setUsername("locked-user");
        user.setLockUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByUsername("locked-user")).thenReturn(Optional.of(user));

        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");

        assertThrows(esprit.pfe.auth.error.LoginException.class, () ->
                securityController.login("locked-user", "password123", request, mock(HttpServletResponse.class)));

        verify(authenticationManager, never()).authenticate(any());
        verify(auditService).logFailedLogin("locked-user", "127.0.0.1", "Account locked");
    }

    @Test
    void login_WhenSuccessfulAndFailedAttemptsExist_ShouldResetState() {
        User user = new User();
        user.setUsername("retry-user");
        user.setEmail("retry@example.com");
        user.setFailedLoginAttempts(2);
        when(userRepository.findByUsername("retry-user")).thenReturn(Optional.of(user));

        Authentication auth = mock(Authentication.class);
        when(auth.getAuthorities()).thenReturn((java.util.Collection) List.of(new SimpleGrantedAuthority("ROLE_USER")));
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        org.springframework.security.oauth2.jwt.Jwt jwt = mock(org.springframework.security.oauth2.jwt.Jwt.class);
        when(jwt.getTokenValue()).thenReturn("retry-jwt");
        when(jwtEncoder.encode(any())).thenReturn(jwt);

        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        HttpServletResponse response = mock(HttpServletResponse.class);

        ResponseEntity<Map<String, Object>> result = securityController.login("retry-user", "password123", request, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(0, user.getFailedLoginAttempts());
        assertEquals(null, user.getLockUntil());
        verify(userRepository).save(user);

        ArgumentCaptor<String> headerCaptor = ArgumentCaptor.forClass(String.class);
        verify(response).addHeader(eq(HttpHeaders.SET_COOKIE), headerCaptor.capture());
        assertTrue(headerCaptor.getValue().contains("d2f_auth_token=retry-jwt"));
    }

    @Test
    void refreshToken_WhenAuthenticated_ShouldReturnCookieAndMetadata() {
        User user = new User();
        user.setId("USER-1");
        user.setUsername("refresh-user");
        user.setEmail("refresh@example.com");
        when(userRepository.findByUsername("refresh-user")).thenReturn(Optional.of(user));

        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("refresh-user");
        when(authentication.getAuthorities()).thenReturn((java.util.Collection) List.of(new SimpleGrantedAuthority("ROLE_USER")));

        org.springframework.security.oauth2.jwt.Jwt jwt = mock(org.springframework.security.oauth2.jwt.Jwt.class);
        when(jwt.getTokenValue()).thenReturn("refreshed-jwt");
        when(jwtEncoder.encode(any())).thenReturn(jwt);

        HttpServletResponse response = mock(HttpServletResponse.class);

        ResponseEntity<Map<String, Object>> result = securityController.refreshToken(authentication, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("refresh-user", result.getBody().get("username"));
        assertEquals("refresh@example.com", result.getBody().get("email"));

        ArgumentCaptor<String> headerCaptor = ArgumentCaptor.forClass(String.class);
        verify(response).addHeader(eq(HttpHeaders.SET_COOKIE), headerCaptor.capture());
        assertTrue(headerCaptor.getValue().contains("d2f_auth_token=refreshed-jwt"));
    }

    @Test
    void refreshToken_WhenAuthenticationMissing_ShouldReturnUnauthorized() {
        HttpServletResponse response = mock(HttpServletResponse.class);

        ResponseEntity<Map<String, Object>> result = securityController.refreshToken(null, response);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(response);
    }

    @Test
    void logout_ShouldExpireCookie() {
        HttpServletResponse response = mock(HttpServletResponse.class);

        ResponseEntity<esprit.pfe.auth.payload.response.MessageResponse> result = securityController.logout(response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("Logged out successfully", result.getBody().getMessage());

        ArgumentCaptor<String> headerCaptor = ArgumentCaptor.forClass(String.class);
        verify(response).addHeader(eq(HttpHeaders.SET_COOKIE), headerCaptor.capture());
        assertTrue(headerCaptor.getValue().contains("Max-Age=0"));
    }

    @Test
    void resetDevices_ShouldClearDeviceIdsAndPersist() {
        User user = new User();
        user.setUsername("device-user");
        user.setDeviceIds(new HashSet<>(Set.of("device-1", "device-2")));
        when(userRepository.findByUsername("device-user")).thenReturn(Optional.of(user));

        ResponseEntity<esprit.pfe.auth.payload.response.MessageResponse> result = securityController.resetDevices("device-user");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue(user.getDeviceIds().isEmpty());
        verify(userRepository).save(user);
    }

    @Test
    void resetPassword_WhenTokenInvalid_ShouldReturnBadRequest() throws Exception {
        String hashed = SecurityController.hashConfirmationToken("invalid-token");
        when(confirmationKeyRepo.findByToken(hashed)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                .param("token", "invalid-token")
                .param("newPassword", "newpass123"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void forgotPassword_WhenAlreadySent_ShouldReturnBadRequest() throws Exception {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);
        when(confirmationKeyRepo.existsByEmailAddress("test@example.com")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                .param("emailAddress", "test@example.com"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void requestDeviceReset_ShouldSendEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/request-reset")
                .param("username", "testuser"))
                .andExpect(status().isOk());

        verify(emailService).send(any());
    }

    @Test
    void registerUser_WhenEmailExists_ShouldReturnBadRequest() throws Exception {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: Email is already in use!"));
    }

    @Test
    void registerUser_WhenIdExists_ShouldReturnBadRequest() throws Exception {
        signupRequest.setId("existing-id");
        when(userRepository.existsById("existing-id")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: ID is already taken!"));
    }

    @Test
    void registerUser_WithRoleCUP_ShouldAssignRoleCUP() throws Exception {
        signupRequest.setRole("CUP");
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(ERole.CUP)).thenReturn(Optional.of(new Role(ERole.CUP)));

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk());

        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerUser_WithRoleEnseignant_ShouldAssignRoleEnseignant() throws Exception {
        signupRequest.setRole("Enseignant");
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk());

        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerUser_WithUnknownRole_ShouldReturnBadRequest() throws Exception {
        signupRequest.setRole("unknown");
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: Role 'unknown' is not recognized."));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerUser_WithNullRole_ShouldAssignDefaultEnseignant() throws Exception {
        signupRequest.setRole(null);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully!"));

        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerUser_WithBlankRole_ShouldAssignDefaultEnseignant() throws Exception {
        signupRequest.setRole("   ");
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(ERole.ENSEIGNANT)).thenReturn(Optional.of(new Role(ERole.ENSEIGNANT)));
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully!"));

        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerUser_WithRoleFormateur_ShouldAssignRoleFormateur() throws Exception {
        signupRequest.setRole("Formateur");
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(ERole.FORMATEUR)).thenReturn(Optional.of(new Role(ERole.FORMATEUR)));
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk());

        verify(userRepository).save(any(User.class));
    }

    @Test
    void login_WhenUserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/login")
                .param("username", "unknown")
                .param("password", "pass"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_WhenUnexpectedException_ShouldReturnUnauthorized() throws Exception {
        when(userRepository.findByUsername("user")).thenReturn(Optional.of(new User()));
        when(authenticationManager.authenticate(any())).thenThrow(new RuntimeException("Crash"));

        mockMvc.perform(post("/api/v1/auth/login")
                .param("username", "user")
                .param("password", "pass"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication failed due to server configuration."));
    }

    @Test
    void forgotPassword_WhenEmailInvalid_ShouldReturnBadRequest() throws Exception {
        when(userRepository.existsByEmail("invalid@test.com")).thenReturn(false);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                .param("emailAddress", "invalid@test.com"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email address invalid"));
    }
}
