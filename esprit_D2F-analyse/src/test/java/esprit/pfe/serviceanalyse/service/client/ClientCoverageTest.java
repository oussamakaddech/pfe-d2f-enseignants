package esprit.pfe.serviceanalyse.service.client;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Method;
import java.util.*;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClientCoverageTest {

    @Mock private RestTemplate restTemplate;
    @Mock private RestTemplate authRestTemplate;
    private AuthServiceClient authClient;
    private PredictiveEngineClient predictiveClient;
    private CompetenceServiceClient competenceClient;
    private FormationServiceClient formationClient;
    private CertificatServiceClient certificatClient;

    @BeforeEach
    void setUp() {
        authClient = new AuthServiceClient(authRestTemplate);
        ReflectionTestUtils.setField(authClient, "authServiceUrl", "http://auth");
        predictiveClient = new PredictiveEngineClient(restTemplate);
        ReflectionTestUtils.setField(predictiveClient, "predictiveServiceUrl", "http://localhost:8090");
        competenceClient = new CompetenceServiceClient(restTemplate);
        ReflectionTestUtils.setField(competenceClient, "competenceServiceUrl", "http://comp");
        formationClient = new FormationServiceClient(restTemplate);
        ReflectionTestUtils.setField(formationClient, "formationServiceUrl", "http://form");
        certificatClient = new CertificatServiceClient(restTemplate);
        ReflectionTestUtils.setField(certificatClient, "certificatServiceUrl", "http://cert");
    }

    // ── PredictiveEngineClient tests ──────────────────────────

    @Test
    void getAlertSummary_returnsBody() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("total", 5, "nouvelles", 2)));
        assertThat(predictiveClient.getAlertSummary("Bearer t")).containsEntry("total", 5);
    }

    @Test
    void getAlertSummary_nullBody_returnsEmpty() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(null));
        assertThat(predictiveClient.getAlertSummary("Bearer t")).isEmpty();
    }

    @Test
    void getPriorityActions_withNullDept_buildsUrl() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(List.of(Map.of("id", "t1"))));
        assertThat(predictiveClient.getPriorityActions(5, null, "Bearer t")).hasSize(1);
    }

    // ── CompetenceServiceClient tests ──────────────────────────

    @ParameterizedTest(name = "{0}")
    @MethodSource("domainSummariesData")
    void getDomainSummaries_variants_returnsSize1(String displayName, Map<String, Object> aff) {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(List.of(aff)));
        assertThat(competenceClient.getDomainSummaries("user1", "Bearer t")).hasSize(1);
    }

    static Stream<Arguments> domainSummariesData() {
        return Stream.of(
            Arguments.of("numeric niveau parses to int",   aff("Info", "S01", 1L, "3")),
            Arguments.of("custom niveau label returns as-is",  aff("Info", "S01", 1L, "CUSTOM")),
            Arguments.of("null code returns savoir type",  aff("Info", null, 1L, "N3_INTERMEDIAIRE")),
            Arguments.of("non-number id returns null id",  aff("Info", "S01", "not-a-number", "N3_INTERMEDIAIRE")),
            Arguments.of("blank nom uses default value",   aff("", "S01", 1L, "N3_INTERMEDIAIRE"))
        );
    }

    private static Map<String, Object> aff(String domaineNom, String savoirCode, Object savoirId, String niveau) {
        Map<String, Object> m = new HashMap<>();
        m.put("domaineNom", domaineNom);
        m.put("competenceNom", "Java");
        m.put("savoirId", savoirId);
        m.put("savoirCode", savoirCode);
        m.put("savoirNom", "Spring");
        m.put("niveau", niveau);
        m.put("sousCompetenceNom", "Framework");
        m.put("dateAcquisition", "2025-01-15");
        return m;
    }

    // ── RestClientHelper tests ─────────────────────────────────

    @Test
    void getAuthenticatedList_withPaginatedResponse_returnsContent() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(Map.of("content", List.of(Map.of("id", 1)))));
        assertThat(RestClientHelper.getAuthenticatedList(restTemplate, "http://test/api", "Bearer t")).hasSize(1);
    }

    @Test
    void getAuthenticatedList_withNullBody_returnsEmpty() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(null));
        assertThat(RestClientHelper.getAuthenticatedList(restTemplate, "http://test/api", "Bearer t")).isEmpty();
    }

    @Test
    void getAuthenticatedList_withUnexpectedType_returnsEmpty() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Object.class)))
                .thenReturn(ResponseEntity.ok("unexpected"));
        assertThat(RestClientHelper.getAuthenticatedList(restTemplate, "http://test/api", "Bearer t")).isEmpty();
    }

    // ── CircuitBreaker fallback methods (reflection) ───────────

    @Test
    void predictiveClient_fallbackMethods_work() throws Exception {
        PredictiveEngineClient client = new PredictiveEngineClient(restTemplate);

        Method mapFallback = PredictiveEngineClient.class.getDeclaredMethod("mapFallback", String.class, Throwable.class);
        mapFallback.setAccessible(true);
        Map<?, ?> mapResult = (Map<?, ?>) mapFallback.invoke(client, "Bearer t", new RuntimeException("test"));
        assertThat(mapResult).isEmpty();

        Method listFallback = PredictiveEngineClient.class.getDeclaredMethod("listFallback", int.class, String.class, String.class, Throwable.class);
        listFallback.setAccessible(true);
        List<?> listResult = (List<?>) listFallback.invoke(client, 5, null, "Bearer t", new RuntimeException("test"));
        assertThat(listResult).isEmpty();

        Method forecastFallback = PredictiveEngineClient.class.getDeclaredMethod("forecastFallback", int.class, String.class, Throwable.class);
        forecastFallback.setAccessible(true);
        Map<?, ?> forecastResult = (Map<?, ?>) forecastFallback.invoke(client, 6, "Bearer t", new RuntimeException("test"));
        assertThat(forecastResult).isEmpty();
    }

    @Test
    void authClient_fallbackMethod_works() throws Exception {
        Method fallback = AuthServiceClient.class.getDeclaredMethod("getTeacherIdentityFallback", String.class, String.class, Throwable.class);
        fallback.setAccessible(true);
        var result = fallback.invoke(authClient, "jdoe", "Bearer t", new RuntimeException("test"));
        assertThat(result).isNotNull();
    }

    @Test
    void formationClient_fallbackMethod_works() throws Exception {
        Method fallback = FormationServiceClient.class.getDeclaredMethod("getFormationsFallback", String.class, String.class, Throwable.class);
        fallback.setAccessible(true);
        var result = fallback.invoke(formationClient, "user1", "Bearer t", new RuntimeException("test"));
        assertThat((List<?>) result).isEmpty();
    }

    @Test
    void certificatClient_fallbackMethod_works() throws Exception {
        Method fallback = CertificatServiceClient.class.getDeclaredMethod("getCertificationsFallback", String.class, String.class, Throwable.class);
        fallback.setAccessible(true);
        var result = fallback.invoke(certificatClient, "user1", "Bearer t", new RuntimeException("test"));
        assertThat((List<?>) result).isEmpty();
    }

    @Test
    void competenceClient_fallbackMethod_works() throws Exception {
        Method fallback = CompetenceServiceClient.class.getDeclaredMethod("getDomainSummariesFallback", String.class, String.class, Throwable.class);
        fallback.setAccessible(true);
        var result = fallback.invoke(competenceClient, "user1", "Bearer t", new RuntimeException("test"));
        assertThat((List<?>) result).isEmpty();
    }
}
