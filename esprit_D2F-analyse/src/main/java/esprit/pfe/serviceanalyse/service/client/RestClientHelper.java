package esprit.pfe.serviceanalyse.service.client;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Utilitaire partagé pour les appels inter-services avec JWT forwarding.
 * Forwarde l'en-tête Authorization de la requête entrante vers le service cible,
 * garantissant que les services aval peuvent valider le token et appliquer leur RBAC.
 */
final class RestClientHelper {

    private RestClientHelper() {}

    /**
     * Effectue un GET authentifié et retourne le corps désérialisé.
     *
     * @param restTemplate instance RestTemplate injectée dans le client appelant
     * @param url          URL complète du service cible
     * @param bearerToken  valeur de l'en-tête Authorization (ex. "Bearer eyJ…") — peut être null
     * @param responseType classe de la réponse attendue
     */
    static <T> T getAuthenticated(RestTemplate restTemplate,
                                  String url,
                                  String bearerToken,
                                  Class<T> responseType) {
        HttpHeaders headers = buildHeaders(bearerToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<T> response = restTemplate.exchange(url, HttpMethod.GET, entity, responseType);
        return response.getBody();
    }

    /**
     * GET authentifié retournant une liste d'objets, tolérant à deux formes de réponse :
     *   - tableau JSON brut : {@code [ {...}, {...} ]}
     *   - page Spring Data  : {@code { "content": [ {...} ], "totalElements": N, ... }}
     *
     * Plusieurs endpoints aval sont passés en réponse paginée (conformité DSI) : ce
     * dépaquetage évite l'échec de désérialisation {@code List <- Object} (HTTP 500).
     * Retourne une liste vide si le corps est absent ou d'une forme inattendue.
     */
    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> getAuthenticatedList(RestTemplate restTemplate,
                                                          String url,
                                                          String bearerToken) {
        Object body = getAuthenticated(restTemplate, url, bearerToken, Object.class);
        if (body instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        if (body instanceof Map<?, ?> map && map.get("content") instanceof List<?> content) {
            return (List<Map<String, Object>>) content;
        }
        return Collections.emptyList();
    }

    private static HttpHeaders buildHeaders(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        if (bearerToken != null && !bearerToken.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, bearerToken);
        }
        return headers;
    }
}
