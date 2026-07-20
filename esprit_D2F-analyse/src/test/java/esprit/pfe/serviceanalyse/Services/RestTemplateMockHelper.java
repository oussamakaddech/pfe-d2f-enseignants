package esprit.pfe.serviceanalyse.services;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Helper de test pour simuler les appels REST inter-services du service analyse.
 *
 * <p>Le service {@link AnalysePredictiveService} utilise désormais
 * {@code restTemplate.exchange(url, GET, HttpEntity(headers), Map.class)} et
 * traite les réponses <b>paginées</b> ({@code {content: [...]}}). Ce helper
 * configure un stub {@code exchange} qui renvoie une page Spring (enveloppe
 * {@code content}) pour chaque endpoint, en fonction d'un fragment d'URL.</p>
 *
 * <p>Il centralise le contrat réel des microservices en aval afin que les tests
 * valident le bon format (Page, champs DTO : {@code niveau}, {@code competenceNom},
 * {@code noteGlobale}, {@code formationId}, ...) et non un format imaginaire.</p>
 */
final class RestTemplateMockHelper {

    private RestTemplateMockHelper() {
    }

    /** Construit une réponse paginée Spring ({content: items}). */
    static Map<String, Object> pageOf(Object... items) {
        Map<String, Object> page = new LinkedHashMap<>();
        page.put("content", List.of(items));
        page.put("totalElements", items.length);
        page.put("number", 0);
        page.put("size", items.length);
        return page;
    }

    /** Construit une réponse d'erreur simulée pour un endpoint. */
    static ResponseEntity<Map<String, Object>> error(HttpStatus status) {
        return ResponseEntity.status(status).body(Collections.emptyMap());
    }

    /**
     * Stube l'endpoint dont l'URL contient {@code urlFragment} pour qu'il renvoie
     * un corps JSON ({@code content: items}) via exchange(GET, Map.class).
     */
    static void mockEndpoint(RestTemplate rt, String urlFragment, Object... items) {
        when(rt.exchange(
                org.mockito.ArgumentMatchers.contains(urlFragment),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)))
            .thenReturn(ResponseEntity.ok(pageOf(items)));
    }

    /**
     * Stube l'endpoint pour qu'il lève une exception (simule une panne du service
     * en aval).
     */
    static void mockEndpointFailure(RestTemplate rt, String urlFragment, RuntimeException ex) {
        when(rt.exchange(
                org.mockito.ArgumentMatchers.contains(urlFragment),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)))
            .thenThrow(ex);
    }

    // Fragments d'URL réels (doivent rester alignés sur AnalysePredictiveService)
    static final String COMPETENCES_ENSEIGNANT = "/api/v1/enseignant-competences/enseignant/";
    static final String COMPETENCES_DOMAINE = "/api/v1/competences/domaine/";
    static final String FORMATIONS = "/api/v1/formations";
    static final String FORMATION_COMPETENCES = "/api/v1/formation-competences/formation/";
    static final String EVALUATIONS = "/api/v1/evaluations-globales";
    static final String BESOINS = "/api/v1/besoins-formations/approved";
    static final String COMPTES = "/api/v1/account/list-accounts";

    // ── Fabriques de DTO conformes aux contrats réels ──────────────

    static Map<String, Object> affectation(long competenceId, String competenceNom,
                                           long domaineId, String domaineNom, String niveau) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("competenceId", competenceId);
        m.put("competenceNom", competenceNom);
        m.put("domaineId", domaineId);
        m.put("domaineNom", domaineNom);
        m.put("niveau", niveau);
        return m;
    }

    static Map<String, Object> competence(long id, String code, String nom) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("code", code);
        m.put("nom", nom);
        return m;
    }

    static Map<String, Object> formation(long id, String titre, String etat) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("formationId", id);
        m.put("titreFormation", titre);
        m.put("etatFormation", etat);
        return m;
    }

    static Map<String, Object> formationCompetence(long competenceId, String competenceNom) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("competenceId", competenceId);
        m.put("competenceNom", competenceNom);
        return m;
    }

    static Map<String, Object> evaluation(double noteGlobale) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("noteGlobale", noteGlobale);
        m.put("enseignantId", "ens1");
        return m;
    }
}
