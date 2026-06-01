package esprit.pfe.serviceevaluation.config;

import feign.RequestTemplate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("FeignServiceAuthInterceptor - Tests unitaires")
class FeignServiceAuthInterceptorTest {

    @Test
    @DisplayName("apply - should add Authorization header with valid service JWT")
    void testApply_shouldAddBearerTokenToAuthorizationHeader() {
        FeignServiceAuthInterceptor interceptor = new FeignServiceAuthInterceptor();
        ReflectionTestUtils.setField(
                interceptor,
                "internalSecret",
                "mySecretKeyForTestingPurposesOnlyWhichMustBeAtLeast512BitsLongToPreventWeakKeyExceptions"
        );

        RequestTemplate template = new RequestTemplate();
        interceptor.apply(template);

        assertThat(template.headers()).containsKey("Authorization");
        String authHeader = template.headers().get("Authorization").iterator().next();
        assertThat(authHeader).startsWith("Bearer ");

        String token = authHeader.substring(7);
        String[] parts = token.split("\\.");
        assertThat(parts).hasSize(3); // Standard header.payload.signature format
    }
}
