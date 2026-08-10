package esprit.pfe.serviceformation.microsoft;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Classe de paramètres pour regrouper les informations d'un événement Outlook.
 * Réduit le nombre de paramètres dans les méthodes de OutlookCalendarService.
 */
@Data
@Builder
public class OutlookEventParameters {
    private String organizerEmail;
    private String eventId;
    private String subject;
    private String htmlContent;
    private OffsetDateTime start;
    private OffsetDateTime end;
    private String salle;
    private List<String> attendeeEmails;
}
