package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;

@Component
@Slf4j
@RequiredArgsConstructor
public class FormationStateScheduler {
    private final FormationRepository formationRepository;
    private final FormationWorkflowService formationWorkflowService;

    /**
     * Exécute toutes les 2 heures.
     */
    @Scheduled(cron = "0 0 */2 * * *")
    public void updateFormationStates() {
        log.info("Le planificateur de mise à jour des formations s'exécute à {}", LocalDate.now(ZoneId.systemDefault()));
        List<Formation> formations = formationRepository.findAll();
        java.time.OffsetDateTime nowRef = java.time.OffsetDateTime.now(java.time.ZoneId.systemDefault());
        LocalDate now = LocalDate.now(ZoneId.systemDefault());
        for (Formation f : formations) {
            f.setLastRefreshDate(nowRef);
            
            // Ne pas modifier les formations annulées
            if (f.getEtatFormation() == EtatFormation.ANNULE) {
                formationRepository.save(f);
                continue;
            }
            
            // Calcul du nouvel état en fonction des dates
            EtatFormation oldState = f.getEtatFormation();
            EtatFormation newState = computeNextState(f, now);
            if (newState != oldState) {
                f.setEtatFormation(newState);
                log.info("Formation {} passe de {} à {}", f.getIdFormation(), oldState, newState);
                
                // Notification automatique par email + calendrier selon le nouvel etat
                formationWorkflowService.handleEtatTransitions(f, oldState);
            }
            formationRepository.save(f);
        }
    }

    private EtatFormation computeNextState(Formation f, LocalDate now) {
        if (now.isBefore(f.getDateDebut())) {
            return EtatFormation.PLANIFIE;
        }
        if (now.isAfter(f.getDateDebut()) && now.isBefore(f.getDateFin())) {
            return EtatFormation.EN_COURS;
        }
        return EtatFormation.ACHEVE;
    }
}
