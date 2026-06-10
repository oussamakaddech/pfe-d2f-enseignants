package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.dto.calendar.IcsEvent;
import esprit.pfe.serviceformation.dto.calendar.SendInvitationsResultDTO;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.services.CalendarExportService;
import esprit.pfe.serviceformation.utils.IcsCalendarWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Déclenche l'envoi d'invitations calendrier (.ics) aux participants, en mode
 * asynchrone (un message par destinataire via {@link CalendarMailSender}).
 */
@Service
@RequiredArgsConstructor
public class CalendarInvitationService {

    private final CalendarExportService exportService;
    private final IcsCalendarWriter icsWriter;
    private final FormationRepository formationRepository;
    private final SeanceFormationRepository seanceRepository;
    private final FormationParticipantEmailRepository participantEmailRepository;
    private final CalendarMailSender mailSender;

    @Value("${d2f.platform.url:}")
    private String platformUrl;

    /** Envoie une invitation à tous les participants d'une formation. */
    @Transactional(readOnly = true)
    public SendInvitationsResultDTO sendForFormation(Long formationId) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new ResourceNotFoundException("Formation introuvable : " + formationId));

        List<String> recipients = resolveRecipients(formationId);
        if (recipients.isEmpty()) {
            return SendInvitationsResultDTO.builder()
                    .formationId(formationId)
                    .status("NO_RECIPIENT")
                    .message("Aucun participant avec une adresse e-mail pour cette formation.")
                    .build();
        }

        List<IcsEvent> events = exportService.buildEventsForFormation(formationId, recipients);
        byte[] ics = icsWriter.buildRequestCalendar(events).getBytes(StandardCharsets.UTF_8);
        String subject = "Invitation : " + formation.getTitreFormation();
        String body = buildBody(formation);

        for (String recipient : recipients) {
            mailSender.sendInvitation(formationId, recipient, ics, subject, body);
        }

        return SendInvitationsResultDTO.builder()
                .formationId(formationId)
                .formationsProcessed(1)
                .recipientsDispatched(recipients.size())
                .status("DISPATCHED")
                .message("Invitations en cours d'envoi (" + recipients.size() + " destinataire(s)).")
                .build();
    }

    /** Envoie les invitations pour toutes les formations planifiées en séances. */
    @Transactional(readOnly = true)
    public SendInvitationsResultDTO sendForAll() {
        List<Long> formationIds = seanceRepository.findDistinctFormationIds();
        int formations = 0;
        int recipients = 0;
        for (Long id : formationIds) {
            SendInvitationsResultDTO result = sendForFormation(id);
            if ("DISPATCHED".equals(result.getStatus())) {
                formations++;
                recipients += result.getRecipientsDispatched();
            }
        }
        return SendInvitationsResultDTO.builder()
                .formationsProcessed(formations)
                .recipientsDispatched(recipients)
                .status("DISPATCHED")
                .message("Invitations dispatchées pour " + formations + " formation(s).")
                .build();
    }

    private List<String> resolveRecipients(Long formationId) {
        Set<String> recipients = new LinkedHashSet<>();
        participantEmailRepository.findDistinctEmailsByFormationId(formationId).forEach(recipients::add);
        seanceRepository.findDistinctParticipantMailsByFormation(formationId).forEach(recipients::add);
        recipients.removeIf(e -> e == null || e.isBlank());
        return new ArrayList<>(recipients);
    }

    private String buildBody(Formation formation) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bonjour,\n\n");
        sb.append("Vous êtes invité(e) à la formation « ").append(formation.getTitreFormation()).append(" ».\n");
        sb.append("Veuillez trouver ci-joint l'invitation au format calendrier (.ics) à ajouter à votre agenda.\n");
        if (platformUrl != null && !platformUrl.isBlank()) {
            sb.append("\nPlateforme D2F : ").append(platformUrl).append("\n");
        }
        sb.append("\nCordialement,\nDirection de la Formation (D2F)");
        return sb.toString();
    }
}
