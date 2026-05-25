
package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.CertificationSummaryDTO;
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

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CertificatServiceClient - Tests")
class CertificatServiceClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private CertificatServiceClient client;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(client, "certificatServiceUrl", "http://localhost:8086");
    }

    @Test
    @DisplayName("getCertificationsForTeacher: retourne les certifications mappées")
    void getCertifications_withData_returnsMappedCerts() {
        List<Map<String, Object>> certs = List.of(
                Map.of("id", 1L, "titreFormation", "Spring Boot",
                        "typeCertif", "CERTIF", "createdAt", "2025-01-15"),
                Map.of("id", 2L, "titreFormation", "AWS",
                        "typeCertif", "BADGE", "createdAt", "2025-03-01")
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(certs));

        List<CertificationSummaryDTO> result = client.getCertificationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getCertificatId()).isEqualTo(1L);
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Spring Boot");
        assertThat(result.get(0).getTypeCertif()).isEqualTo("CERTIF");
        assertThat(result.get(0).getDateObtention()).isEqualTo("2025-01-15");
        assertThat(result.get(1).getTypeCertif()).isEqualTo("BADGE");
    }

    @Test
    @DisplayName("getCertificationsForTeacher: réponse null retourne liste vide")
    void getCertifications_withNullResponse_returnsEmptyList() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(null));

        List<CertificationSummaryDTO> result = client.getCertificationsForTeacher("user1", "Bearer token");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getCertificationsForTeacher: id non-Number retourne certificatId null")
    void getCertifications_withNonNumberId_returnsNullCertificatId() {
        List<Map<String, Object>> certs = List.of(
                Map.of("id", "string-id", "titreFormation", "Test",
                        "typeCertif", "ATTESTATION", "createdAt", "2025-01-01")
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(certs));

        List<CertificationSummaryDTO> result = client.getCertificationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCertificatId()).isNull();
        assertThat(result.get(0).getTypeCertif()).isEqualTo("ATTESTATION");
    }



    @Test
    @DisplayName("getCertificationsForTeacher: champs null retournent valeurs par défaut")
    void getCertifications_withNullFields_returnsDefaults() {
        List<Map<String, Object>> certs = new ArrayList<>();
        Map<String, Object> cert = new LinkedHashMap<>();
        cert.put("id", 1L);
        certs.add(cert);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(certs));

        List<CertificationSummaryDTO> result = client.getCertificationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitreFormation()).isEmpty();
        assertThat(result.get(0).getTypeCertif()).isEmpty();
        assertThat(result.get(0).getDateObtention()).isEmpty();
    }
}
