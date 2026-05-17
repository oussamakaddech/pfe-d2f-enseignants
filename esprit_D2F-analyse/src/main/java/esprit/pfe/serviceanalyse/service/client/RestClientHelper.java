package esprit.pfe.serviceanalyse.service.client;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

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

    private static HttpHeaders buildHeaders(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        if (bearerToken != null && !bearerToken.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, bearerToken);
        }
        return headers;
    }
}
