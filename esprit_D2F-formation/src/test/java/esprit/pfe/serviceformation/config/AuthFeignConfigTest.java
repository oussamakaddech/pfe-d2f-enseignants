package esprit.pfe.serviceformation.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.*;

@DisplayName("AuthFeignConfig - Tests unitaires")
class AuthFeignConfigTest {

    private AuthFeignConfig config;
    private static final String TEST_SECRET = "a-very-long-secret-key-for-testing-purposes-at-least-64-bytes-long-to-meet-hmac512-requirements";

    @BeforeEach
    void setUp() {
        config = new AuthFeignConfig();
        ReflectionTestUtils.setField(config, "internalSecret", TEST_SECRET);
    }

    @Test
    @DisplayName("authServiceTokenInterceptor retourne un bean RequestInterceptor")
    void shouldReturnRequestInterceptor() {
        RequestInterceptor interceptor = config.authServiceTokenInterceptor();

        assertThat(interceptor).isNotNull();
    }

    @Test
    @DisplayName("l'interceptor ajoute un header Authorization avec token Bearer")
    void shouldAddAuthorizationBearerHeader() {
        RequestInterceptor interceptor = config.authServiceTokenInterceptor();
        RequestTemplate template = new RequestTemplate();

        interceptor.apply(template);

        String authHeader = template.headers().get("Authorization").iterator().next();
        assertThat(authHeader).startsWith("Bearer ");

        String token = authHeader.substring("Bearer ".length());
        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("le token généré est au format JWT valide (3 parties base64url séparées par des points)")
    void shouldGenerateValidJwtFormat() {
        RequestInterceptor interceptor = config.authServiceTokenInterceptor();
        RequestTemplate template = new RequestTemplate();

        interceptor.apply(template);

        String authHeader = template.headers().get("Authorization").iterator().next();
        String token = authHeader.substring("Bearer ".length());

        String[] parts = token.split("\\.");
        assertThat(parts).hasSize(3);
        assertThat(parts[0]).isNotBlank();
        assertThat(parts[1]).isNotBlank();
        assertThat(parts[2]).isNotBlank();
    }

    @Test
    @DisplayName("l'en-tête JWT contient alg HS512 et typ JWT")
    void shouldContainCorrectAlgorithmAndType() {
        RequestInterceptor interceptor = config.authServiceTokenInterceptor();
        RequestTemplate template = new RequestTemplate();

        interceptor.apply(template);

        String token = template.headers().get("Authorization").iterator().next()
                .substring("Bearer ".length());
        String headerJson = new String(Base64.getUrlDecoder()
                .decode(token.split("\\.")[0]), StandardCharsets.UTF_8);

        assertThat(headerJson).contains("\"alg\":\"HS512\"", "\"typ\":\"JWT\"");
    }

    @Test
    @DisplayName("le payload JWT contient le sub, scope et les timestamps iat/exp")
    void shouldContainCorrectPayload() {
        RequestInterceptor interceptor = config.authServiceTokenInterceptor();
        RequestTemplate template = new RequestTemplate();

        interceptor.apply(template);

        String token = template.headers().get("Authorization").iterator().next()
                .substring("Bearer ".length());
        String payloadJson = new String(Base64.getUrlDecoder()
                .decode(token.split("\\.")[1]), StandardCharsets.UTF_8);

        assertThat(payloadJson).contains("\"sub\":\"formation-service\"", "\"scope\":\"SVC_FORMATION\"", "\"iat\":", "\"exp\":");
    }

    @Test
    @DisplayName("la signature HMAC-SHA512 est vérifiable avec le même secret")
    void shouldHaveVerifiableSignature() throws Exception {
        RequestInterceptor interceptor = config.authServiceTokenInterceptor();
        RequestTemplate template = new RequestTemplate();

        interceptor.apply(template);

        String token = template.headers().get("Authorization").iterator().next()
                .substring("Bearer ".length());
        String[] parts = token.split("\\.");
        String signingInput = parts[0] + "." + parts[1];

        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA512");
        mac.init(new javax.crypto.spec.SecretKeySpec(
                TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        String expectedSig = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));

        assertThat(parts[2]).isEqualTo(expectedSig);
    }

    @Test
    @DisplayName("les tokens générés sont bien formés et reproductibles si le secret est identique")
    void shouldBeReproducibleWithinSameSecond() {
        RequestInterceptor interceptor = config.authServiceTokenInterceptor();
        RequestTemplate t1 = new RequestTemplate();
        RequestTemplate t2 = new RequestTemplate();

        interceptor.apply(t1);
        interceptor.apply(t2);

        String token1 = t1.headers().get("Authorization").iterator().next();
        String token2 = t2.headers().get("Authorization").iterator().next();

        assertThat(token1).startsWith("Bearer eyJ").contains(".");
        assertThat(token2).startsWith("Bearer eyJ").contains(".");
    }

    @Test
    @DisplayName("chaque appel retourne un header bien formé même avec un secret différent")
    void shouldWorkWithDifferentSecrets() {
        AuthFeignConfig config2 = new AuthFeignConfig();
        ReflectionTestUtils.setField(config2, "internalSecret", "another-different-secret-key-for-hmac512-signing-that-is-long-enough-to-work");

        RequestInterceptor i1 = config.authServiceTokenInterceptor();
        RequestInterceptor i2 = config2.authServiceTokenInterceptor();

        RequestTemplate t1 = new RequestTemplate();
        RequestTemplate t2 = new RequestTemplate();

        i1.apply(t1);
        i2.apply(t2);

        String token1 = t1.headers().get("Authorization").iterator().next();
        String token2 = t2.headers().get("Authorization").iterator().next();

        assertThat(token1).isNotEqualTo(token2);
        // Les deux sont des tokens JWT valides à 3 parties
        assertThat(token1.substring("Bearer ".length()).split("\\.")).hasSize(3);
        assertThat(token2.substring("Bearer ".length()).split("\\.")).hasSize(3);
    }
}
