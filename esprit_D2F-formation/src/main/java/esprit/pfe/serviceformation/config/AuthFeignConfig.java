package esprit.pfe.serviceformation.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Base64;

/**
 * Configuration Feign SCOPÉE à {@code AuthAccountClient} uniquement.
 *
 * <p>Volontairement NON annotée {@code @Configuration} et NON {@code @Component} :
 * référencée seulement via {@code @FeignClient(configuration = AuthFeignConfig.class)},
 * elle ne s'applique donc pas globalement aux autres clients Feign (ex. EvaluationClient).</p>
 *
 * <p>Génère un jeton de service HS512 (scope {@code SVC_FORMATION} → autorité
 * {@code ROLE_SVC_FORMATION} côté auth) signé avec le secret JWT interne partagé.
 * Aucun secret en dur : tout vient des variables d'environnement.</p>
 */
public class AuthFeignConfig {

    @Value("${services.internal.jwt-secret:${jwt.secret}}")
    private String internalSecret;

    @Bean
    public RequestInterceptor authServiceTokenInterceptor() {
        return template -> template.header("Authorization", "Bearer " + generateServiceToken());
    }

    private String generateServiceToken() {
        String header = base64Url("{\"alg\":\"HS512\",\"typ\":\"JWT\"}");
        long now = Instant.now().getEpochSecond();
        String payload = base64Url(
                "{\"sub\":\"formation-service\",\"iat\":" + now + ",\"exp\":" + (now + 300)
                        + ",\"scope\":\"SVC_FORMATION\"}");
        String signingInput = header + "." + payload;
        return signingInput + "." + sign(signingInput);
    }

    private String base64Url(String json) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(internalSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Échec de signature du jeton de service", e);
        }
    }
}
