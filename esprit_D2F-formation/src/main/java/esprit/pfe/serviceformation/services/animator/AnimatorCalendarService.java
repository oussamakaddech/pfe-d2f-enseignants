package esprit.pfe.serviceformation.services.animator;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationAnimator;
import esprit.pfe.serviceformation.entities.FormationAnimatorProposal;
import esprit.pfe.serviceformation.messaging.AnimatorProposalEventPublisher;
import esprit.pfe.serviceformation.messaging.FormationAnimatorEvent;
import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationAnimatorProposalRepository;
import esprit.pfe.serviceformation.services.CalendarExportService;
import esprit.pfe.serviceformation.services.calendar.CalendarMailSender;
import esprit.pfe.serviceformation.dto.calendar.IcsEvent;
import esprit.pfe.serviceformation.utils.IcsCalendarWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

/**
 * Invitations calendrier des animateurs — idempotentes.
 *
 * <p>Idempotence : un identifiant d'événement unique est dérivé
 * (formation + animateur + rôle) et persisté sur la proposition ; une seconde
 * confirmation ne renvoie JAMAIS un doublon. L'échec d'envoi est journalisé
 * pour reprise (statut traçable), sans faire échouer la transition métier.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnimatorCalendarService {

    private final FormationAnimatorProposalRepository proposalRepository;
    private final EnseignantRepository enseignantRepository;
    private final AnimateurExterneRepository animateurExterneRepository;
    private final CalendarExportService exportService;
    private final IcsCalendarWriter icsWriter;
    private final CalendarMailSender mailSender;
    private final AnimatorProposalEventPublisher eventPublisher;

    /**
     * Appelé après confirmation d'un animateur : envoie l'invitation à
     * l'animateur puis aux participants, une seule fois (idempotence).
     */
    @Transactional
    public void onAnimatorConfirmed(Formation formation, FormationAnimator assignment,
                                    FormationAnimatorProposal proposal) {
        String eventId = buildEventId(formation.getIdFormation(), assignment);
        if (eventId.equals(proposal.getCalendarEventId())) {
            log.info("Invitation déjà envoyée pour la proposition {} (eventId {}) — doublon ignoré",
                    proposal.getId(), eventId);
            return;
        }
        sendAnimatorInvitation(formation, assignment, eventId);
        proposal.setCalendarEventId(eventId);
        proposalRepository.save(proposal);

        eventPublisher.publishCalendarInvitationRequested(FormationAnimatorEvent.builder()
                .eventId(AnimatorProposalEventPublisher.newEventId())
                .eventType("CALENDAR_INVITATION_REQUESTED")
                .assignmentId(assignment.getId())
                .formationId(formation.getIdFormation())
                .formationTitre(formation.getTitreFormation())
                .proposalId(proposal.getId())
                .animatorId(assignment.getTeacherId() != null
                        ? assignment.getTeacherId() : assignment.getAnimateurId())
                .role(assignment.getRole().name())
                .assignedBy(assignment.getAssignedBy())
                .occurredAt(java.time.Instant.now())
                .build());
    }

    /** Envoi effectif de l'invitation à l'animateur (email auditée, .ics joint). */
    private void sendAnimatorInvitation(Formation formation, FormationAnimator assignment, String eventId) {
        String recipient = resolveAnimatorEmail(assignment);
        if (recipient == null || recipient.isBlank()) {
            log.warn("Invitation animateur non envoyée : adresse e-mail introuvable pour l'affectation {}",
                    assignment.getId());
            return;
        }
        List<IcsEvent> events = exportService.buildEventsForFormation(
                formation.getIdFormation(), List.of(recipient));
        byte[] ics = icsWriter.buildRequestCalendar(events).getBytes(StandardCharsets.UTF_8);
        String subject = "Invitation animation : " + formation.getTitreFormation();
        String body = "Vous êtes confirmé comme " + assignment.getRole()
                + " de la formation « " + formation.getTitreFormation() + " » ("
                + formation.getDateDebut() + " → " + formation.getDateFin() + ").";
        mailSender.sendInvitation(formation.getIdFormation(), recipient, ics, subject, body);
        log.info("Invitation calendrier animateur envoyée : formation {} → animateur {} (eventId {})",
                formation.getIdFormation(), assignment.getTeacherId() != null
                        ? assignment.getTeacherId() : assignment.getAnimateurId(),
                eventId);
    }

    /** Identifiant d'événement déterministe : formation + animateur + rôle. */
    private String buildEventId(Long formationId, FormationAnimator assignment) {
        String animatorId = assignment.getTeacherId() != null
                ? assignment.getTeacherId() : assignment.getAnimateurId();
        return "animator-invite:" + formationId + ":" + animatorId + ":" + assignment.getRole();
    }

    /** E-mail de l'animateur : interne (fiche enseignant) ou externe (bureau). */
    private String resolveAnimatorEmail(FormationAnimator assignment) {
        if (assignment.getTeacherId() != null) {
            Optional<Enseignant> ens = enseignantRepository.findById(assignment.getTeacherId());
            if (ens.isPresent()) {
                return ens.get().getMail();
            }
            return null;
        }
        if (assignment.getAnimateurId() != null) {
            return animateurExterneRepository.findById(Long.valueOf(assignment.getAnimateurId()))
                    .map(a -> a.getEmail())
                    .orElse(null);
        }
        return null;
    }
}
