package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class EvaluationRefreshScheduler {

    private final EvaluationGlobaleRepository evaluationGlobaleRepository;

    /**
     * Rafraîchit les données d'évaluation toutes les 2 heures.
     */
    @Scheduled(cron = "0 0 */2 * * *")
    public void refreshEvaluations() {
        log.info("Mise à jour périodique des évaluations (toutes les 2h)");
        List<EvaluationGlobale> evaluations = evaluationGlobaleRepository.findAll();
        OffsetDateTime now = OffsetDateTime.now();
        
        for (EvaluationGlobale eval : evaluations) {
            eval.setLastRefreshDate(now);
            evaluationGlobaleRepository.save(eval);
        }
        log.info("{} évaluations rafraîchies.", evaluations.size());
    }
}
