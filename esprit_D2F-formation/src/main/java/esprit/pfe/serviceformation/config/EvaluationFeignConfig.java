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
 * Configuration Feign SCOPÉE à {@code EvaluationClient} (non {@code @Configuration}).
 *
 * <p>Jeton de service HS512 de scope {@code ROLE_SVC_FORMATION} : côté évaluation,
 * le claim {@code scope} devient l'autorité telle quelle (sans préfixe ajouté),
 * parité avec le jeton {@code ROLE_SVC_EVALUATION} envoyé dans l'autre sens.
 * Sans jeton, chaque appel était refusé et le critère « évaluation soumise »
 * des certificats retombait toujours sur le repli {@code false}.</p>
 */
public class EvaluationFeignConfig {

    @Value("${services.internal.jwt-secret:${jwt.secret}}")
    private String internalSecret;

    @Bean
    public RequestInterceptor evaluationServiceTokenInterceptor() {
        return template -> template.header("Authorization", "Bearer " + generateServiceToken());
    }

    private String generateServiceToken() {
        String header = base64Url("{\"alg\":\"HS512\",\"typ\":\"JWT\"}");
        long now = Instant.now().getEpochSecond();
        String payload = base64Url(
                "{\"sub\":\"formation-service\",\"iat\":" + now + ",\"exp\":" + (now + 300)
                        + ",\"scope\":\"ROLE_SVC_FORMATION\"}");
        String signingInput = header + "." + payload;
        return signingInput + "." + sign(signingInput);
    }

    private String base64Url(String json) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(internalSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Échec de signature du jeton de service", e);
        }
    }
}
