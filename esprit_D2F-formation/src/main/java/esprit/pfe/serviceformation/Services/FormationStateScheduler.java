package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.Date;
import java.util.List;

@Component
public class FormationStateScheduler {

    @Autowired
    private FormationRepository formationRepository;

    @Autowired
    private FormationWorkflowService formationWorkflowService;

    /**
     * Exécute chaque minute.
     */
    @Scheduled(cron = "0 * * * * ?")
    public void updateFormationStates() {
        System.out.println("Le planificateur de mise à jour des formations s'exécute à " + new Date());
        List<Formation> formations = formationRepository.findAll();
        Date now = new Date();
        for (Formation f : formations) {
            // Ne pas modifier les formations annulées
            if (f.getEtatFormation() == EtatFormation.ANNULE) {
                continue;
            }
            // Calcul du nouvel état en fonction des dates
            EtatFormation oldState = f.getEtatFormation();
            EtatFormation newState = computeNextState(f, now);
            if (newState != oldState) {
                f.setEtatFormation(newState);
                formationRepository.save(f);
                System.out.println("Formation " + f.getIdFormation() + " passe de " + oldState + " à " + newState);
                // Selon le nouvel état, synchroniser le calendrier
                if (newState == EtatFormation.PLANIFIE || newState == EtatFormation.EN_COURS) {
                    // Créer ou mettre à jour les événements
                    formationWorkflowService.synchronizeFormationCalendar(f);
                } else if (newState == EtatFormation.ACHEVE) {
                    // Supprimer les événements du calendrier
                    formationWorkflowService.removeFormationCalendar(f);
                }
            }
        }
    }

    /**
     * Détermine le nouvel état de la formation selon les dates :
     * - Avant la date de début : PLANIFIEE
     * - Entre date de début et date de fin : EN_COURS
     * - Après la date de fin : ACHEVEE
     *
     *
     *
     *
     *
     *
     *
     *
     *
     * 
     */
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
