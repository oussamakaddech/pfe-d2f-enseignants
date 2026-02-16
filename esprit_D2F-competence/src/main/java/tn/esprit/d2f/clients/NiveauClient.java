package tn.esprit.d2f.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.esprit.d2f.entity.NiveauDTO;

@FeignClient(name = "Niveau", url = "http://localhost:8003")
public interface NiveauClient {
    @GetMapping("/niveaux/retrieve-Niveau/{idNiveau}")
    NiveauDTO retrieveNiveau(@PathVariable Long idNiveau);
}
