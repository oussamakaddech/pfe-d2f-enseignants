package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.dto.calendar.IcsEvent;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.utils.IcsCalendarWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Génère des calendriers iCalendar (.ics) conformes RFC 5545 à partir des
 * séances de formation. Compatible Outlook, Google Calendar et Apple Calendar.
 * <p>
 * Trois portées d'export : tout le calendrier, une formation, ou le calendrier
 * personnel d'un participant (filtré par e-mail).
 */
@Service
@RequiredArgsConstructor
public class CalendarExportService {

    private final SeanceFormationRepository seanceFormationRepository;
    private final FormationRepository formationRepository;
    private final FormationParticipantEmailRepository participantEmailRepository;
    private final IcsCalendarWriter icsWriter;
    private final CalendarProperties properties;

    /** .ics de toutes les séances de toutes les formations. */
    @Transactional(readOnly = true)
    public String generateIcsForAll() {
        List<SeanceFormation> seances = seanceFormationRepository.findAllByOrderByDateSeanceAscHeureDebutAsc();
        return icsWriter.buildPublishCalendar(toEvents(seances, null));
    }

    /** .ics de toutes les séances d'une formation. */
    @Transactional(readOnly = true)
    public String generateIcsForFormation(Long formationId) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new ResourceNotFoundException("Formation introuvable : " + formationId));
        List<SeanceFormation> seances =
                seanceFormationRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(formationId);
        return icsWriter.buildPublishCalendar(toEvents(seances, formation));
    }

    /**
     * Calendrier personnel d'un participant, identifié par son e-mail.
     * Union des séances où l'e-mail est un participant (enseignant) et des séances
     * des formations où l'e-mail figure comme participant importé.
     */
    @Transactional(readOnly = true)
    public String generateIcsForParticipantEmail(String email) {
        List<SeanceFormation> all = collectSeancesForEmail(email);
        return icsWriter.buildPublishCalendar(toEvents(all, null));
    }

    /** .ics des séances d'un enseignant (animateur ou participant) — compatibilité historique. */
    @Transactional(readOnly = true)
    public String generateIcsForEnseignant(String enseignantId) {
        Map<Long, SeanceFormation> unique = new LinkedHashMap<>();
        seanceFormationRepository.findByAnimateurs_Id(enseignantId).forEach(s -> unique.put(s.getIdSeance(), s));
        seanceFormationRepository.findByParticipants_Id(enseignantId).forEach(s -> unique.put(s.getIdSeance(), s));
        return icsWriter.buildPublishCalendar(toEvents(new ArrayList<>(unique.values()), null));
    }

    /**
     * Construit les évènements d'une formation en y attachant des participants
     * (utilisé pour les invitations METHOD:REQUEST).
     */
    @Transactional(readOnly = true)
    public List<IcsEvent> buildEventsForFormation(Long formationId, List<String> attendeeEmails) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new ResourceNotFoundException("Formation introuvable : " + formationId));
        List<SeanceFormation> seances =
                seanceFormationRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(formationId);
        List<IcsEvent> events = new ArrayList<>();
        for (SeanceFormation s : seances) {
            events.add(toIcsEvent(s, formation, attendeeEmails));
        }
        return events;
    }

    // ==================== INTERNE ====================

    private List<SeanceFormation> collectSeancesForEmail(String email) {
        Map<Long, SeanceFormation> unique = new LinkedHashMap<>();
        seanceFormationRepository.findByParticipantMail(email)
                .forEach(s -> unique.put(s.getIdSeance(), s));
        List<Long> formationIds = participantEmailRepository.findFormationIdsByEmail(email);
        if (!formationIds.isEmpty()) {
            seanceFormationRepository.findByFormation_IdFormationIn(formationIds)
                    .forEach(s -> unique.put(s.getIdSeance(), s));
        }
        return new ArrayList<>(unique.values());
    }

    private List<IcsEvent> toEvents(List<SeanceFormation> seances, Formation knownFormation) {
        List<IcsEvent> events = new ArrayList<>();
        for (SeanceFormation s : seances) {
            Formation formation = knownFormation != null ? knownFormation : s.getFormation();
            events.add(toIcsEvent(s, formation, null));
        }
        return events;
    }

    private IcsEvent toIcsEvent(SeanceFormation s, Formation formation, List<String> attendees) {
        LocalDateTime start = toLocalDateTime(s.getDateSeance(), s.getHeureDebut());
        LocalDateTime end = toLocalDateTime(s.getDateSeance(), s.getHeureFin());
        if (end != null && start != null && !end.isAfter(start)) {
            end = start.plusHours(1); // garde-fou : durée minimale d'une heure
        }
        String titre = formation != null ? formation.getTitreFormation() : "Formation";
        String location = s.getSalle() != null && !s.getSalle().isBlank()
                ? s.getSalle()
                : (formation != null ? formation.getSalle() : null);

        return IcsEvent.builder()
                .uid("d2f-seance-" + s.getIdSeance() + "@" + uidDomain())
                .start(start)
                .end(end)
                .summary(properties.getSummaryPrefix() + titre + sessionSuffix(s))
                .description(buildDescription(s, formation))
                .location(location)
                .status(resolveStatus(formation))
                .attendeeEmails(attendees)
                .build();
    }

    private String sessionSuffix(SeanceFormation s) {
        if (s.getNumeroSeance() != null && s.getTotalSeances() != null) {
            return " (Séance " + s.getNumeroSeance() + "/" + s.getTotalSeances() + ")";
        }
        return "";
    }

    private String buildDescription(SeanceFormation s, Formation formation) {
        StringBuilder desc = new StringBuilder();
        if (formation != null) {
            desc.append("Formation: ").append(formation.getTitreFormation()).append("\n");
        }
        if (s.getNumeroSeance() != null && s.getTotalSeances() != null) {
            desc.append("Séance: ").append(s.getNumeroSeance()).append("/").append(s.getTotalSeances()).append("\n");
        }
        if (s.getAnimateurs() != null && !s.getAnimateurs().isEmpty()) {
            String animStr = s.getAnimateurs().stream()
                    .map(a -> safe(a.getPrenom()) + " " + safe(a.getNom()))
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");
            desc.append("Animateurs: ").append(animStr.trim()).append("\n");
        }
        if (s.getTypeSeance() != null) {
            desc.append("Type: ").append(s.getTypeSeance()).append("\n");
        }
        if (s.getSessionStatus() != null && !s.getSessionStatus().isBlank()) {
            desc.append("Statut: ").append(s.getSessionStatus()).append("\n");
        }
        if (s.getOnlineMeetingUrl() != null && !s.getOnlineMeetingUrl().isBlank()) {
            desc.append("Lien: ").append(s.getOnlineMeetingUrl()).append("\n");
        }
        return desc.toString().trim();
    }

    private String resolveStatus(Formation formation) {
        if (formation != null && formation.getEtatFormation() == EtatFormation.ANNULE) {
            return "CANCELLED";
        }
        return "CONFIRMED";
    }

    private LocalDateTime toLocalDateTime(Date date, Time time) {
        if (date == null) {
            return null;
        }
        ZoneId zone = ZoneId.of(properties.getTimezone());
        LocalDate localDate = date.toInstant().atZone(zone).toLocalDate();
        LocalTime localTime = time != null ? time.toLocalTime() : LocalTime.of(9, 0);
        return LocalDateTime.of(localDate, localTime);
    }

    private String uidDomain() {
        String email = properties.getOrganizerEmail();
        int at = email != null ? email.indexOf('@') : -1;
        return at >= 0 ? email.substring(at + 1) : "d2f.local";
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }
}
