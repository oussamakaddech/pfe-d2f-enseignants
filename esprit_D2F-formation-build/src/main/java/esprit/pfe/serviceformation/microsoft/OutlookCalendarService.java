package esprit.pfe.serviceformation.microsoft;

import com.microsoft.graph.models.*;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

// DSI §4/§2 — Service Azure AD conditionnel : désactivé par défaut (azure.ad.enabled=false).
// Activer uniquement sur décision DSI avec AZURE_AD_ENABLED=true.
@Service
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
@Slf4j
@RequiredArgsConstructor
public class OutlookCalendarService {

    private static final String TIMEZONE = "Africa/Tunis";
    private final MicrosoftGraphClientProvider graphProvider;

    public static class EventCreationResult {
        private String eventId;
        private String joinUrl;

        public EventCreationResult(String eventId, String joinUrl) {
            this.eventId = eventId;
            this.joinUrl = joinUrl;
        }

        public String getEventId() { return eventId; }
        public String getJoinUrl() { return joinUrl; }
    }

    public EventCreationResult addEventToCalendarAndReturnIdWithTeamsUrl(OutlookEventParameters params) {
        GraphServiceClient<Request> graphClient = graphProvider.getGraphClient();

        Event event = new Event();
        event.subject = params.getSubject();
        event.isOnlineMeeting = true;
        event.onlineMeetingProvider = OnlineMeetingProviderType.TEAMS_FOR_BUSINESS;

        ItemBody body = new ItemBody();
        body.contentType = BodyType.HTML;
        body.content = params.getHtmlContent();
        event.body = body;

        DateTimeTimeZone startTime = new DateTimeTimeZone();
        startTime.dateTime = params.getStart().toString();
        startTime.timeZone = TIMEZONE;
        event.start = startTime;

        DateTimeTimeZone endTime = new DateTimeTimeZone();
        endTime.dateTime = params.getEnd().toString();
        endTime.timeZone = TIMEZONE;
        event.end = endTime;

        Location location = new Location();
        location.displayName = params.getSalle();
        event.location = location;

        if (params.getAttendeeEmails() != null && !params.getAttendeeEmails().isEmpty()) {
            event.attendees = params.getAttendeeEmails().stream().map(email -> {
                Attendee attendee = new Attendee();
                EmailAddress emailAddress = new EmailAddress();
                emailAddress.address = email;
                attendee.emailAddress = emailAddress;
                return attendee;
            }).toList();
        }

        Event createdEvent;
        try {
            createdEvent = graphClient.users(params.getOrganizerEmail())
                    .events()
                    .buildRequest()
                    .post(event);
        } catch (Exception e) {
            throw new IllegalStateException("Erreur creation Outlook pour " + params.getOrganizerEmail() + ": " + e.getMessage(), e);
        }
        
        String joinUrl = (createdEvent.onlineMeeting != null) ? createdEvent.onlineMeeting.joinUrl : null;
        return new EventCreationResult(createdEvent.id, joinUrl);
    }

    public EventCreationResult updateEventInCalendarWithTeamsUrl(OutlookEventParameters params) {
        GraphServiceClient<Request> graphClient = graphProvider.getGraphClient();

        Event updatedEvent = new Event();
        updatedEvent.subject = params.getSubject();
        updatedEvent.isOnlineMeeting = true;
        updatedEvent.onlineMeetingProvider = OnlineMeetingProviderType.TEAMS_FOR_BUSINESS;

        ItemBody body = new ItemBody();
        body.contentType = BodyType.HTML;
        body.content = params.getHtmlContent();
        updatedEvent.body = body;

        DateTimeTimeZone startTime = new DateTimeTimeZone();
        startTime.dateTime = params.getStart().toString();
        startTime.timeZone = TIMEZONE;
        updatedEvent.start = startTime;

        DateTimeTimeZone endTime = new DateTimeTimeZone();
        endTime.dateTime = params.getEnd().toString();
        endTime.timeZone = TIMEZONE;
        updatedEvent.end = endTime;

        Location location = new Location();
        location.displayName = params.getSalle();
        updatedEvent.location = location;

        if (params.getAttendeeEmails() != null && !params.getAttendeeEmails().isEmpty()) {
            updatedEvent.attendees = params.getAttendeeEmails().stream().map(email -> {
                Attendee attendee = new Attendee();
                EmailAddress emailAddress = new EmailAddress();
                emailAddress.address = email;
                attendee.emailAddress = emailAddress;
                return attendee;
            }).toList();
        }

        Event patchedEvent;
        try {
            patchedEvent = graphClient.users(params.getOrganizerEmail())
                    .events(params.getEventId())
                    .buildRequest()
                    .patch(updatedEvent);
        } catch (Exception e) {
            throw new IllegalStateException("Erreur mise a jour Outlook " + params.getEventId() + ": " + e.getMessage(), e);
        }
        
        String joinUrl = (patchedEvent.onlineMeeting != null) ? patchedEvent.onlineMeeting.joinUrl : null;
        return new EventCreationResult(params.getEventId(), joinUrl);
    }

    public void deleteEventInCalendar(String organizerEmail, String eventId) {
        GraphServiceClient<Request> graphClient = graphProvider.getGraphClient();
        try {
            graphClient.users(organizerEmail)
                    .events(eventId)
                    .buildRequest()
                    .delete();
            log.info("Evenement Outlook {} supprime pour {}", eventId, organizerEmail);
        } catch (Exception e) {
            log.warn("Erreur suppression Outlook {} : {}", eventId, e.getMessage());
        }
    }

    // Compatibilité - à refactorer si possible plus tard
    public String addEventToCalendarAndReturnId(String organizerEmail, String subject, String htmlContent, OffsetDateTime start, OffsetDateTime end, String salle, List<String> attendeeEmails) {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail(organizerEmail)
                .subject(subject)
                .htmlContent(htmlContent)
                .start(start)
                .end(end)
                .salle(salle)
                .attendeeEmails(attendeeEmails)
                .build();
        return addEventToCalendarAndReturnIdWithTeamsUrl(params).getEventId();
    }

    public void addEventToCalendar(String userEmail, String subject, String content, OffsetDateTime start, OffsetDateTime end, String salle) {
        addEventToCalendarAndReturnId(userEmail, subject, content, start, end, salle, null);
    }
}
