package esprit.pfe.serviceevaluation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "formation-service", url = "${services.formation.url:http://localhost:8081}", fallback = FormationClientFallback.class)
public interface FormationClient {
    @GetMapping("/api/v1/formations/{id}")
    Object getFormation(@PathVariable("id") Long id);
}
