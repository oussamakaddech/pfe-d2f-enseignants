package tn.esprit.d2f.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.esprit.d2f.entity.DomaineDTO;

@FeignClient(name = "Domaine", url = "http://localhost:8002")
public interface DomaineClient {
    @GetMapping("/domaines/retrieve-domaine/{idDomaine}")
    DomaineDTO retrieveDomaine(@PathVariable Long idDomaine);
}
