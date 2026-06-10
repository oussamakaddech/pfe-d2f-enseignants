package esprit.pfe.serviceanalyse.service.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Client REST vers le moteur d'analyse prédictive (FastAPI, port 8090).
 *
 * Le service-analyse joue le rôle de BFF : il agrège ces vues analytiques et les
 * réexpose sous {@code /api/v1/analyse-predictive/**} (route gateway dédiée), sans
 * dupliquer la logique ML.
 *
 * <p>Le token JWT entrant est forwardé pour que le moteur FastAPI applique son
 * propre RBAC. Chaque appel est protégé par un CircuitBreaker {@code predictive-cb} :
 * si le moteur est indisponible, on retourne une charge vide plutôt qu'une erreur.</p>
 */
@Slf4j
@Component
public class PredictiveEngineClient {

    /** Préfixe des endpoints analytics v1 du moteur FastAPI ({@code prefix /api} + router {@code /v1/analytics}). */
    private static final String ANALYTICS_BASE = "/api/v1/analytics";

    private final RestTemplate restTemplate;

    @Value("${services.predictive.url}")
    private String predictiveServiceUrl;

    public PredictiveEngineClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /** Tuiles d'en-tête avec deltas. */
    @CircuitBreaker(name = "predictive-cb", fallbackMethod = "mapFallback")
    public Map<String, Object> getOverview(String bearerToken) {
        return getMap(predictiveServiceUrl + ANALYTICS_BASE + "/dashboard/overview", bearerToken);
    }

    /** Synthèse des alertes (agrégats + tendance 30j). */
    @CircuitBreaker(name = "predictive-cb", fallbackMethod = "mapFallback")
    public Map<String, Object> getAlertSummary(String bearerToken) {
        return getMap(predictiveServiceUrl + ANALYTICS_BASE + "/alerts/summary", bearerToken);
    }

    /** File d'actions priorisée (enseignants à traiter). */
    @CircuitBreaker(name = "predictive-cb", fallbackMethod = "listFallback")
    public List<Map<String, Object>> getPriorityActions(int limit, String departementId, String bearerToken) {
        StringBuilder url = new StringBuilder(predictiveServiceUrl)
                .append(ANALYTICS_BASE).append("/actions/priority?limit=").append(limit);
        if (departementId != null && !departementId.isBlank()) {
            url.append("&departement_id=")
               .append(URLEncoder.encode(departementId, StandardCharsets.UTF_8));
        }
        return RestClientHelper.getAuthenticatedList(restTemplate, url.toString(), bearerToken);
    }

    /** Prévision de la demande de formation (série + projection). */
    @CircuitBreaker(name = "predictive-cb", fallbackMethod = "forecastFallback")
    public Map<String, Object> getDemandForecast(int months, String bearerToken) {
        String url = predictiveServiceUrl + ANALYTICS_BASE + "/dashboard/demand-forecast?months=" + months;
        return getMap(url, bearerToken);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(String url, String bearerToken) {
        Map<String, Object> body = RestClientHelper.getAuthenticated(restTemplate, url, bearerToken, Map.class);
        return body != null ? body : Collections.emptyMap();
    }

    // ── Fallbacks CircuitBreaker ─────────────────────────────
    @SuppressWarnings("unused")
    private Map<String, Object> mapFallback(String bearerToken, Throwable t) {
        log.warn("CircuitBreaker [predictive-cb] fallback (map) : {}", t.getMessage());
        return Collections.emptyMap();
    }

    @SuppressWarnings("unused")
    private List<Map<String, Object>> listFallback(int limit, String departementId, String bearerToken, Throwable t) {
        log.warn("CircuitBreaker [predictive-cb] fallback (list) : {}", t.getMessage());
        return Collections.emptyList();
    }

    @SuppressWarnings("unused")
    private Map<String, Object> forecastFallback(int months, String bearerToken, Throwable t) {
        log.warn("CircuitBreaker [predictive-cb] fallback (forecast) : {}", t.getMessage());
        return Collections.emptyMap();
    }
}
