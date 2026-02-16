package tn.esprit.d2f.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.esprit.d2f.entity.SavoirDTO;

@FeignClient(name = "Savoir", url = "http://localhost:8005")
public interface SavoirClient {
    @GetMapping("/savoirs/retrieve-Savoir/{idSavoir}")
    SavoirDTO retrieveSavoir(@PathVariable Long idSavoir);
}
