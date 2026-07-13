package esprit.pfe.serviceanalyse.exception;

/**
 * Raised when the FastAPI Predictive Analytics engine (or any critical downstream)
 * is unavailable. The BFF maps this to HTTP 502 — a critical outage is surfaced
 * loudly, never hidden behind a silent empty response.
 */
public class PredictiveAnalyticsUnavailableException extends RuntimeException {
    public PredictiveAnalyticsUnavailableException(Throwable cause) {
        super("Le service d'analyse prédictive est indisponible (circuit ouvert / timeout / erreur upstream).", cause);
    }

    public PredictiveAnalyticsUnavailableException(String message) {
        super(message);
    }
}
