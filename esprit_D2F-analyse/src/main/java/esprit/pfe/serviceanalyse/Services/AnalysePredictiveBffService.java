package esprit.pfe.serviceanalyse.services;

import esprit.pfe.serviceanalyse.service.client.PredictiveEngineClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * BFF (Backend For Frontend) de l'analyse prédictive.
 *
 * Agrège plusieurs vues du moteur FastAPI ({@link PredictiveEngineClient}) en
 * réponses consolidées prêtes à afficher, sans réimplémenter la logique ML. La
 * résilience (fallbacks vides) est assurée par les CircuitBreaker du client.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysePredictiveBffService {

    /** Nombre d'actions prioritaires incluses dans le digest d'alertes. */
    private static final int DIGEST_ACTIONS_LIMIT = 5;

    private final PredictiveEngineClient engine;

    /**
     * Vue consolidée d'en-tête : KPIs (avec deltas) + synthèse d'alertes.
     * Deux appels moteur fusionnés en une seule charge utile.
     */
    public Map<String, Object> overview(String bearerToken) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kpis", engine.getOverview(bearerToken));
        result.put("alertes", resumeAlertes(engine.getAlertSummary(bearerToken)));
        result.put("source", "analyse-bff");
        return result;
    }

    /**
     * Digest d'alertes : synthèse globale + top actions prioritaires à traiter.
     */
    public Map<String, Object> alertsDigest(String bearerToken) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("resume", engine.getAlertSummary(bearerToken));
        result.put("actions_prioritaires", engine.getPriorityActions(DIGEST_ACTIONS_LIMIT, null, bearerToken));
        return result;
    }

    /**
     * File d'actions priorisée (passe-plat enrichi du moteur, filtrable par département).
     */
    public List<Map<String, Object>> priorityActions(int limit, String departementId, String bearerToken) {
        return engine.getPriorityActions(limit, departementId, bearerToken);
    }

    /** Impact réel global des formations suivies (agrégats historiques). */
    public Map<String, Object> trainingImpact(String bearerToken) {
        return engine.getTrainingImpact(bearerToken);
    }

    /** Classement paginé des formations selon leur impact (gain de niveau). */
    public Map<String, Object> trainingImpactFormations(int page, int size, String bearerToken) {
        return engine.getTrainingImpactFormations(page, size, bearerToken);
    }

    /** Simulation what-if : projection du risque si un plan de formations est suivi. */
    public Map<String, Object> simulateWhatIf(Map<String, Object> plan, String bearerToken) {
        return engine.simulateWhatIf(plan, bearerToken);
    }

    private Map<String, Object> resumeAlertes(Map<String, Object> alertes) {
        Map<String, Object> resume = new LinkedHashMap<>();
        resume.put("total", alertes.getOrDefault("total", 0));
        resume.put("nouvelles", alertes.getOrDefault("nouvelles", 0));
        resume.put("critiques_ouvertes", alertes.getOrDefault("critiques_ouvertes", 0));
        return resume;
    }
}
