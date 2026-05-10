package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.Date;
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
        log.info("Le planificateur de mise à jour des formations s'exécute à {}", new Date());
        List<Formation> formations = formationRepository.findAll();
        java.time.OffsetDateTime nowRef = java.time.OffsetDateTime.now();
        Date now = new Date();
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
                
                // Selon le nouvel état, synchroniser le calendrier
                if (newState == EtatFormation.PLANIFIE || newState == EtatFormation.EN_COURS) {
                    formationWorkflowService.synchronizeFormationCalendar(f);
                } else if (newState == EtatFormation.ACHEVE) {
                    formationWorkflowService.removeFormationCalendar(f);
                }
            }
            formationRepository.save(f);
        }
    }

    private EtatFormation computeNextState(Formation f, Date now) {
        if (now.before(f.getDateDebut())) {
            return EtatFormation.PLANIFIE;
        }
        if (now.after(f.getDateDebut()) && now.before(f.getDateFin())) {
            return EtatFormation.EN_COURS;
        }
        return EtatFormation.ACHEVE;
    }
}
