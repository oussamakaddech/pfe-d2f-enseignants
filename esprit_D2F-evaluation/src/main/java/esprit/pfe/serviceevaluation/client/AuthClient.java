package esprit.pfe.serviceevaluation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "auth-service", url = "${services.auth.url:http://localhost:8085}", fallback = AuthClientFallback.class)
public interface AuthClient {
    @GetMapping("/api/v1/account/profile/{id}")
    Object getEnseignant(@PathVariable("id") String id);
}
