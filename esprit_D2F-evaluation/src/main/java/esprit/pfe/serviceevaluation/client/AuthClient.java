package esprit.pfe.serviceevaluation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "auth-service", url = "${services.auth.url}", fallback = AuthClientFallback.class)
public interface AuthClient {
    @GetMapping("/api/v1/account/exists/{id}")
    boolean enseignantExists(@PathVariable("id") String id);
}
