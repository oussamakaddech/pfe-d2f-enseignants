package esprit.pfe.serviceevaluation.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Base64;

@Component
public class FeignServiceAuthInterceptor implements RequestInterceptor {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Override
    public void apply(RequestTemplate template) {
        String token = generateServiceToken();
        template.header("Authorization", "Bearer " + token);
    }

    private String generateServiceToken() {
        String header = base64Url("{\"alg\":\"HS512\",\"typ\":\"JWT\"}");
        long now = Instant.now().getEpochSecond();
        String payload = base64Url(
                "{\"sub\":\"evaluation-service\",\"iat\":" + now + ",\"exp\":" + (now + 300) + ",\"scope\":\"ROLE_ADMIN ROLE_FORMATEUR\"}"
        );
        String signatureInput = header + "." + payload;
        String signature = sign(signatureInput);
        return signatureInput + "." + signature;
    }

    private String base64Url(String json) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String sign(String data) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to sign JWT", e);
        }
    }
}
