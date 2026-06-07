package esprit.pfe.serviceformation.feign;

import esprit.pfe.serviceformation.dto.AccountCreationRequest;
import esprit.pfe.serviceformation.dto.AuthUserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Client Feign d'ÉCRITURE vers le service auth, utilisé par l'orchestration
 * « compte + fiche enseignant » en un seul appel.
 *
 * <p>Le JWT de l'administrateur appelant est passé EXPLICITEMENT en
 * {@code @RequestHeader} (et non via un intercepteur lisant un ThreadLocal) :
 * avec le circuit breaker actif, Feign s'exécute sur un thread distinct
 * (TimeLimiter) où {@code RequestContextHolder} serait vide. En capturant l'en-
 * tête comme argument côté thread requête, il est figé dans le template avant le
 * changement de thread. {@code create-account}/{@code delete} exigent
 * {@code ROLE_ADMIN} (ACCOUNT_CREATE / ACCOUNT_DELETE).</p>
 *
 * <p>PAS de fallback : toute erreur (409, 403…) doit remonter pour être traitée
 * (et déclencher la compensation si besoin).</p>
 */
@FeignClient(
        name = "auth-account-write-service",
        url = "${services.auth.url:http://localhost:8085}",
        contextId = "authAccountWriteClient")
public interface AuthAccountWriteClient {

    @PostMapping("/api/v1/account/create-account")
    AuthUserResponse createAccount(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                   @RequestBody AccountCreationRequest request,
                                   @RequestParam("role") String role);

    @DeleteMapping("/api/v1/account/delete/{userId}")
    void deleteAccount(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                       @PathVariable("userId") String userId);
}
