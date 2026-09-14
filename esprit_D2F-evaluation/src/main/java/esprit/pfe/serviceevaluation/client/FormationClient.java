package esprit.pfe.serviceevaluation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "formation-service", url = "${services.formation.url:http://localhost:8088}", fallback = FormationClientFallback.class)
public interface FormationClient {
    @GetMapping("/api/v1/formations/{id}")
    Object getFormation(@PathVariable("id") Long id);

    @GetMapping("/api/v1/formations/{formationId}/is-animateur/{enseignantId}")
    Boolean isAnimateurOfFormation(@PathVariable("formationId") Long formationId, @PathVariable("enseignantId") String enseignantId);

    @GetMapping("/api/v1/formations/{formationId}/is-participant/{enseignantId}")
    Boolean isParticipantOfFormation(@PathVariable("formationId") Long formationId, @PathVariable("enseignantId") String enseignantId);
}
