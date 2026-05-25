
package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.TeacherIdentityDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthServiceClient - Tests")
class AuthServiceClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AuthServiceClient client;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(client, "authServiceUrl", "http://localhost:8085");
    }

    @Test
    @DisplayName("getTeacherIdentity: retourne l'identité à partir du profil")
    void getTeacherIdentity_withValidProfile_returnsIdentity() {
        Map<String, Object> profile = Map.of(
                "id", "123", "userName", "jdoe",
                "firsName", "John", "lastName", "Doe",
                "email", "jdoe@esprit.tn", "role", "ENSEIGNANT",
                "phoneNumber", "+21612345678"
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(profile));

        TeacherIdentityDTO result = client.getTeacherIdentity("jdoe", "Bearer token");

        assertThat(result).isNotNull();
        assertThat(result.getEnseignantId()).isEqualTo("123");
        assertThat(result.getUsername()).isEqualTo("jdoe");
        assertThat(result.getPrenom()).isEqualTo("John");
        assertThat(result.getNom()).isEqualTo("Doe");
        assertThat(result.getEmail()).isEqualTo("jdoe@esprit.tn");
        assertThat(result.getRole()).isEqualTo("ENSEIGNANT");
        assertThat(result.getTelephone()).isEqualTo("+21612345678");
    }

    @Test
    @DisplayName("getTeacherIdentity: body null retourne fallback identity")
    void getTeacherIdentity_withNullBody_returnsFallback() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(null));

        TeacherIdentityDTO result = client.getTeacherIdentity("jdoe", "Bearer token");

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("jdoe");
        assertThat(result.getEnseignantId()).isEqualTo("jdoe");
        assertThat(result.getNom()).isEqualTo("Enseignant");
        assertThat(result.getPrenom()).isEqualTo("jdoe");
    }



    @Test
    @DisplayName("getTeacherIdentity: champs null dans le profil")
    void getTeacherIdentity_withNullFields_returnsNullFields() {
        Map<String, Object> profile = Map.of("id", "123", "userName", "jdoe");

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(profile));

        TeacherIdentityDTO result = client.getTeacherIdentity("jdoe", "Bearer token");

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("jdoe");
        assertThat(result.getPrenom()).isNull();
        assertThat(result.getNom()).isNull();
        assertThat(result.getEmail()).isNull();
    }
}
