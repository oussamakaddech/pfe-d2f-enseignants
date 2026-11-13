package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;

@Component
@Slf4j
@RequiredArgsConstructor
public class FormationStateScheduler {
    /** Fuseau de l'école : la « date du jour » ne dépend pas du fuseau du conteneur. */
    static final ZoneId ZONE = ZoneId.of("Africa/Tunis");

    private final FormationRepository formationRepository;
    private final FormationWorkflowService formationWorkflowService;

    /** Rattrapage au démarrage : sans lui, un état périmé attendait la prochaine heure paire. */
    @EventListener(ApplicationReadyEvent.class)
    public void updateFormationStatesAtStartup() {
        updateFormationStates();
    }

    /**
     * Exécute toutes les 2 heures.
     */
    @Scheduled(cron = "0 0 */2 * * *", zone = "Africa/Tunis")
    public void updateFormationStates() {
        LocalDate now = LocalDate.now(ZONE);
        OffsetDateTime nowRef = OffsetDateTime.now(ZONE);
        log.info("Le planificateur de mise à jour des formations s'exécute à {}", now);
        List<Formation> formations = formationRepository.findAll();
        for (Formation f : formations) {
            // Une formation en erreur ne doit pas bloquer la mise à jour des suivantes.
            try {
                updateOne(f, now, nowRef);
            } catch (Exception e) {
                log.error("Mise à jour d'état impossible pour la formation {} : {}",
                        f.getIdFormation(), e.getMessage(), e);
            }
        }
    }

    private void updateOne(Formation f, LocalDate now, OffsetDateTime nowRef) {
        f.setLastRefreshDate(nowRef);

        // Ne pas modifier les formations annulées
        if (f.getEtatFormation() == EtatFormation.ANNULE) {
            formationRepository.save(f);
            return;
        }

        // Calcul du nouvel état en fonction des dates
        EtatFormation oldState = f.getEtatFormation();
        EtatFormation newState = computeNextState(f, now);
        if (newState != null && newState != oldState) {
            f.setEtatFormation(newState);
            log.info("Formation {} passe de {} à {}", f.getIdFormation(), oldState, newState);

            // Notification automatique par email + calendrier selon le nouvel etat
            formationWorkflowService.handleEtatTransitions(f, oldState);
        }
        formationRepository.save(f);
    }

    /**
     * État attendu à la date {@code now} :
     * avant la date de début → PLANIFIE ; du jour de début au jour de fin inclus
     * → EN_COURS ; une fois la date de fin passée → ACHEVE. Sans dates : null
     * (état inchangé).
     * <p>Règle unique du projet : réutilisée par l'import du calendrier
     * ({@code WorkshopCalendarImportService}) pour qu'une formation importée reçoive
     * immédiatement l'état qu'aurait posé ce planificateur.
     */
    public static EtatFormation computeNextState(Formation f, LocalDate now) {
        if (f.getDateDebut() == null || f.getDateFin() == null) {
            return null;
        }
        if (now.isBefore(f.getDateDebut())) {
            return EtatFormation.PLANIFIE;
        }
        if (!now.isAfter(f.getDateFin())) {
            return EtatFormation.EN_COURS;
        }
        return EtatFormation.ACHEVE;
    }
}
