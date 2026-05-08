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
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    void forgotPassword_WhenEmailInvalid_ShouldReturnError() throws Exception {
        when(userRepository.existsByEmail("invalid@example.com")).thenReturn(false);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                .param("emailAddress", "invalid@example.com"))
                .andExpect(status().isBadRequest());

        verify(emailService, never()).send(any());
    }
}
