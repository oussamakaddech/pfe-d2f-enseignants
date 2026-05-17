package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.CertificationSummaryDTO;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Client REST vers le service-certificat (port 8086).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRAT D'API REQUIS dans service-certificat (à créer si absent) :
 *
 *   @GetMapping("/api/v1/certificates/enseignant/{enseignantId}")
 *   @PreAuthorize(AuthorizationMatrix.CERTIFICAT_READ)
 *   public ResponseEntity<List<CertificateResponse>> getByEnseignant(
 *       @PathVariable String enseignantId)
 *
 *   CertificateResponse {
 *     Long   id;              // ID du certificat
 *     Long   formationId;     // ID de la formation associée
 *     String enseignantId;    // ID de l'enseignant
 *     String titreFormation;  // titre de la formation (join nécessaire côté service)
 *     String typeCertif;      // CERTIF | BADGE | ATTESTATION
 *     String createdAt;       // "yyyy-MM-dd" — date d'émission
 *   }
 *
 * Implémentation suggérée dans CertificateController (service-certificat) :
 *   @GetMapping("/certificates/enseignant/{enseignantId}")
 *   public ResponseEntity<List<CertificateResponse>> getByEnseignant(@PathVariable String enseignantId) {
 *       List<Certificate> certs = certificateRepository.findByEnseignantId(enseignantId);
 *       return ResponseEntity.ok(certs.stream().map(CertificateResponse::new).toList());
 *   }
 *   // Et dans CertificateRepository :
 *   List<Certificate> findByEnseignantId(String enseignantId);
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * JWT forwarding : le token entrant est forwardé pour que le service-certificat
 * puisse valider le rôle de l'appelant (CERTIFICAT_READ).
 */
@Slf4j
@Component
public class CertificatServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.certificat.url:http://localhost:8086}")
    private String certificatServiceUrl;

    public CertificatServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    @CircuitBreaker(name = "certificat-cb", fallbackMethod = "getCertificationsFallback")
    public List<CertificationSummaryDTO> getCertificationsForTeacher(String enseignantId, String bearerToken) {
        String url = certificatServiceUrl + "/api/v1/certificates/enseignant/" + enseignantId;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> certs = (List<Map<String, Object>>) (List<?>) RestClientHelper.getAuthenticated(restTemplate, url, bearerToken, List.class);
        if (certs == null) return Collections.emptyList();

        List<CertificationSummaryDTO> result = new ArrayList<>();
        for (Map<String, Object> c : certs) {
            result.add(CertificationSummaryDTO.builder()
                    .certificatId(toLong(c.get("id")))
                    .titreFormation(str(c.get("titreFormation")))
                    .typeCertif(str(c.get("typeCertif")))
                    .dateObtention(str(c.get("createdAt")))
                    .build());
        }
        return result;
    }

    /**
     * Fallback CircuitBreaker : retourne une liste vide plutôt qu'une exception.
     */
    @SuppressWarnings("unused")
    private List<CertificationSummaryDTO> getCertificationsFallback(String enseignantId, String bearerToken, Throwable t) {
        log.warn("CircuitBreaker [certificat-cb] fallback pour enseignant={} : {}", enseignantId, t.getMessage());
        return Collections.emptyList();
    }

    private Long toLong(Object obj) {
        if (obj instanceof Number n) return n.longValue();
        return null;
    }

    private String str(Object o) {
        return (o != null && !"null".equals(String.valueOf(o))) ? String.valueOf(o) : "";
    }
}
