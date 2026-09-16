package esprit.pfe.serviceformation.feign;

import esprit.pfe.serviceformation.config.AuthFeignConfig;
import esprit.pfe.serviceformation.dto.AccountSummaryDTO;
import esprit.pfe.serviceformation.dto.AccountSummaryRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

/**
 * Client Feign vers le service auth pour récupérer des résumés de comptes
 * (rôle + statut actif) lors de la construction des profils unifiés.
 * Porte un jeton de service (cf. {@link AuthFeignConfig}). En cas d'indisponibilité,
 * le fallback renvoie une liste vide → dégradation gracieuse (profils sans compte).
 */
@FeignClient(
        name = "auth-account-service",
        url = "${services.auth.url:http://localhost:8085}",
        contextId = "authAccountClient",
        configuration = AuthFeignConfig.class,
        fallback = AuthAccountClientFallback.class)
public interface AuthAccountClient {

    @PostMapping("/api/v1/account/summaries")
    List<AccountSummaryDTO> getAccountSummaries(@RequestBody AccountSummaryRequest request);
}
