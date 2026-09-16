package esprit.pfe.serviceformation.feign;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import esprit.pfe.serviceformation.dto.EvaluationFormateurDTO;

/**
 * Blocker DSI #11 : repli (fallback) du circuit breaker pour {@link EvaluationClient}.
 *
 * <p>Si le service d'évaluation est indisponible (timeout / circuit ouvert), l'envoi
 * en masse des évaluations échouait sans protection. Ce repli journalise l'incident
 * et dégrade gracieusement : le flux formation n'est pas interrompu par une panne
 * d'un service en aval (les évaluations pourront être rejouées ultérieurement).
 */
@Component
public class EvaluationClientFallback implements EvaluationClient {

    private static final Logger log = LoggerFactory.getLogger(EvaluationClientFallback.class);

    @Override
    public void createEvaluationsBulk(List<EvaluationFormateurDTO> dtos) {
        int count = dtos != null ? dtos.size() : 0;
        log.warn("Service d'évaluation indisponible (circuit ouvert) : "
                + "{} évaluation(s) non transmise(s), à rejouer ultérieurement.", count);
    }
}
