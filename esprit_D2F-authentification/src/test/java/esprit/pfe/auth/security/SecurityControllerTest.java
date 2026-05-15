package esprit.pfe.auth.security;

import esprit.pfe.auth.entities.ERole;
import esprit.pfe.auth.entities.Role;
import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.repositories.ConfirmationKeyRepo;
import esprit.pfe.auth.repositories.RoleRepository;
import esprit.pfe.auth.repositories.UserRepository;
import esprit.pfe.auth.services.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SecurityController.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for unit testing controller
class SecurityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private RoleRepository roleRepository;

    @MockitoBean
    private AuthenticationManager authenticationManager;

    @MockitoBean
    private JwtEncoder jwtEncoder;

    @MockitoBean
    private ConfirmationKeyRepo confirmationKeyRepo;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private esprit.pfe.auth.services.AuditService auditService;

    @Autowired
    private ObjectMapper objectMapper;

    private SignupRequest signupRequest;

    @BeforeEach
    void setUp() {
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
                .andExpect(content().string("Password changed"));
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
                .andExpect(jsonPath("$.accessToken").value("mock-jwt-token"));
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
    void resetPassword_WhenTokenInvalid_ShouldReturnBadRequest() throws Exception {
        when(confirmationKeyRepo.findByToken("invalid-token")).thenReturn(Optional.empty());

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
