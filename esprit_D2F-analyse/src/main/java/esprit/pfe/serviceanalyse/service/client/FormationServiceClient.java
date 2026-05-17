package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.TrainingHistoryDTO;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Client REST vers le service-formation (port 8088).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRAT D'API implémenté dans service-formation :
 *
 *   GET /api/v1/inscription/enseignant/{enseignantId}
 *   → InscriptionController (@RequestMapping("/api/v1/inscription"))
 *   → ResponseEntity<List<InscriptionSummaryDTO>>
 *
 *   InscriptionSummaryDTO {
 *     String formationId;          // ID de la formation
 *     String titreFormation;       // titre de la formation
 *     String dateDebut;            // "yyyy-MM-dd"
 *     String dateFin;              // "yyyy-MM-dd"
 *     String chargeHoraire;        // ex. "40"
 *     String etatFormation;        // PLANIFIEE | EN_COURS | TERMINEE | ANNULEE
 *     List<String> competencesCiblees; // noms des compétences ciblées
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Fallback : si l'endpoint spécifique n'est pas disponible, retour sur /formations
 * (toutes les formations, hors ANNULEE) avec liste vide de compétences.
 *
 * JWT forwarding : le token entrant est forwardé pour respecter le RBAC
 * du service-formation.
 */
@Slf4j
@Component
public class FormationServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.formation.url:http://localhost:8088}")
    private String formationServiceUrl;

    public FormationServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    @CircuitBreaker(name = "formation-cb", fallbackMethod = "getFormationsFallback")
    public List<TrainingHistoryDTO> getFormationsForTeacher(String enseignantId, String bearerToken) {
        // Tentative sur l'endpoint inscriptions dédié
        try {
            String url = formationServiceUrl + "/api/v1/inscription/enseignant/" + enseignantId;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> inscriptions = (List<Map<String, Object>>) (List<?>) RestClientHelper.getAuthenticated(restTemplate, url, bearerToken, List.class);
            if (inscriptions != null && !inscriptions.isEmpty()) {
                return mapInscriptions(inscriptions);
            }
        } catch (Exception e) {
            log.warn("Endpoint /inscription/enseignant/{} indisponible, fallback /formations : {}",
                    enseignantId, e.getMessage());
        }

        // Fallback interne : toutes les formations
        String url = formationServiceUrl + "/formations";
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> formations = (List<Map<String, Object>>) (List<?>) RestClientHelper.getAuthenticated(restTemplate, url, bearerToken, List.class);
        if (formations == null) return Collections.emptyList();
        return mapFormations(formations);
    }

    /**
     * Fallback CircuitBreaker : retourne une liste vide (données partielles)
     * plutôt qu'une exception cascade.
     */
    @SuppressWarnings("unused")
    private List<TrainingHistoryDTO> getFormationsFallback(String enseignantId, String bearerToken, Throwable t) {
        log.warn("CircuitBreaker [formation-cb] fallback pour enseignant={} : {}", enseignantId, t.getMessage());
        return Collections.emptyList();
    }

    private List<TrainingHistoryDTO> mapInscriptions(List<Map<String, Object>> inscriptions) {
        List<TrainingHistoryDTO> result = new ArrayList<>();
        for (Map<String, Object> insc : inscriptions) {
            result.add(TrainingHistoryDTO.builder()
                    .formationId(str(insc.get("formationId")))
                    .titre(str(insc.get("titreFormation")))
                    .dateDebut(str(insc.get("dateDebut")))
                    .dateFin(str(insc.get("dateFin")))
                    .duree(str(insc.get("chargeHoraire")) + "h")
                    .statut(str(insc.get("etatFormation")))
                    .competencesCiblees(toStringList(insc.get("competencesCiblees")))
                    .build());
        }
        return result;
    }

    private List<TrainingHistoryDTO> mapFormations(List<Map<String, Object>> formations) {
        List<TrainingHistoryDTO> result = new ArrayList<>();
        for (Map<String, Object> f : formations) {
            String etat = str(f.get("etatFormation"));
            if ("ANNULEE".equals(etat)) continue;
            result.add(TrainingHistoryDTO.builder()
                    .formationId(str(f.get("formationId")))
                    .titre(str(f.get("titreFormation")))
                    .dateDebut(str(f.get("dateDebut")))
                    .dateFin(str(f.get("dateFin")))
                    .duree(str(f.get("chargeHoraireGlobal")) + "h")
                    .statut(etat)
                    .competencesCiblees(Collections.emptyList())
                    .build());
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object obj) {
        if (obj instanceof List) return (List<String>) obj;
        return Collections.emptyList();
    }

    private String str(Object o) {
        return (o != null && !"null".equals(String.valueOf(o))) ? String.valueOf(o) : "";
    }
}
