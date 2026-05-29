package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.TeacherIdentityDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceClientTest {

    @Mock private RestTemplate restTemplate;

    private AuthServiceClient authServiceClient;

    @BeforeEach
    void setUp() {
        authServiceClient = new AuthServiceClient(restTemplate);
        ReflectionTestUtils.setField(authServiceClient, "authServiceUrl", "http://localhost:8085");
    }

    @Test
    void getTeacherIdentity_returnsIdentity() {
        Map<String, Object> body = Map.of(
                "id", "42",
                "userName", "jdoe",
                "firsName", "John",
                "lastName", "Doe",
                "email", "jdoe@esprit.tn",
                "role", "TEACHER",
                "phoneNumber", "+216123456");
        ResponseEntity<Map> responseEntity = new ResponseEntity<>(body, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(), any(Class.class)))
                .thenReturn(responseEntity);

        TeacherIdentityDTO result = authServiceClient.getTeacherIdentity("jdoe", "Bearer token");

        assertThat(result.getUsername()).isEqualTo("jdoe");
        assertThat(result.getEnseignantId()).isEqualTo("42");
        assertThat(result.getPrenom()).isEqualTo("John");
        assertThat(result.getNom()).isEqualTo("Doe");
        assertThat(result.getEmail()).isEqualTo("jdoe@esprit.tn");
        assertThat(result.getRole()).isEqualTo("TEACHER");
        assertThat(result.getTelephone()).isEqualTo("+216123456");
    }

    @Test
    void getTeacherIdentity_nullBody_returnsFallback() {
        ResponseEntity<Map> responseEntity = new ResponseEntity<>(null, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(), any(Class.class)))
                .thenReturn(responseEntity);

        TeacherIdentityDTO result = authServiceClient.getTeacherIdentity("jdoe", "Bearer token");

        assertThat(result.getUsername()).isEqualTo("jdoe");
        assertThat(result.getNom()).isEqualTo("Enseignant");
        assertThat(result.getPrenom()).isEqualTo("jdoe");
    }

    @Test
    void getTeacherIdentity_restTemplateThrows_throwsException() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(), any(Class.class)))
                .thenThrow(new RuntimeException("Service unavailable"));

        assertThrows(RuntimeException.class,
                () -> authServiceClient.getTeacherIdentity("jdoe", "Bearer token"));
    }

    @Test
    void getTeacherIdentityFromJwt_returnsIdentity() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("jdoe");
        when(jwt.getClaimAsString("email")).thenReturn("jdoe@esprit.tn");
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(jwt);

        TeacherIdentityDTO result = authServiceClient.getTeacherIdentityFromJwt(authentication);

        assertThat(result.getUsername()).isEqualTo("jdoe");
        assertThat(result.getEmail()).isEqualTo("jdoe@esprit.tn");
        assertThat(result.getNom()).isEqualTo("Enseignant");
        assertThat(result.getPrenom()).isEqualTo("jdoe");
    }

    @Test
    void getTeacherIdentityFromJwt_throwsException_returnsFallback() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenThrow(new RuntimeException("Invalid JWT"));
        when(authentication.getName()).thenReturn("fallbackUser");

        TeacherIdentityDTO result = authServiceClient.getTeacherIdentityFromJwt(authentication);

        assertThat(result.getUsername()).isEqualTo("fallbackUser");
        assertThat(result.getNom()).isEqualTo("Enseignant");
    }
}
