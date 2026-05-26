package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.TeacherIdentityDTO;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Client REST vers le service d'authentification (port 8085).
 * Récupère le profil d'un enseignant par son username ou son userId.
 *
 * Contrat d'API utilisé :
 *   GET /api/v1/account/profile/{username}   → UserDTO JSON
 */
@Slf4j
@Component
public class AuthServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.auth.url:http://localhost:8085}")
    private String authServiceUrl;

    public AuthServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    @CircuitBreaker(name = "auth-cb", fallbackMethod = "getTeacherIdentityFallback")
    public TeacherIdentityDTO getTeacherIdentity(String username, String bearerToken) {
        String url = authServiceUrl + "/api/v1/account/profile/" + username;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", bearerToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        @SuppressWarnings("unchecked")
        ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        Map<String, Object> body = response.getBody();
        if (body == null) return fallbackIdentity(username);

        return TeacherIdentityDTO.builder()
                .enseignantId(str(body.get("id")))
                .username(str(body.get("userName")))
                .prenom(str(body.get("firsName")))
                .nom(str(body.get("lastName")))
                .email(str(body.get("email")))
                .role(str(body.get("role")))
                .telephone(str(body.get("phoneNumber")))
                .build();
    }

    /**
     * Extrait l'identité directement du JWT Bearer pour les utilisateurs authentifiés.
     * Évite les appels HTTP vers auth quand on a déjà les claims en main.
     * Utile pour les utilisateurs qui cherchent leur propre passeport.
     */
    public TeacherIdentityDTO getTeacherIdentityFromJwt(Authentication authentication) {
        try {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            String username = jwt.getSubject();
            String email = jwt.getClaimAsString("email");

            return TeacherIdentityDTO.builder()
                    .username(username)
                    .enseignantId(username)
                    .email(email)
                    .nom("Enseignant")
                    .prenom(username)
                    .build();
        } catch (Exception e) {
            log.warn("Impossible d'extraire l'identité du JWT : {}", e.getMessage());
            return fallbackIdentity(authentication.getName());
        }
    }

    /**
     * Fallback CircuitBreaker : retourne une identité partielle plutôt qu'une exception.
     */
    @SuppressWarnings("unused")
    private TeacherIdentityDTO getTeacherIdentityFallback(String username, String bearerToken, Throwable t) {
        log.warn("CircuitBreaker [auth-cb] fallback pour username={} : {}", username, t.getMessage());
        return fallbackIdentity(username);
    }

    private TeacherIdentityDTO fallbackIdentity(String username) {
        return TeacherIdentityDTO.builder()
                .username(username)
                .enseignantId(username)
                .nom("Enseignant")
                .prenom(username)
                .build();
    }

    private String str(Object o) {
        return o != null ? String.valueOf(o) : null;
    }
}
