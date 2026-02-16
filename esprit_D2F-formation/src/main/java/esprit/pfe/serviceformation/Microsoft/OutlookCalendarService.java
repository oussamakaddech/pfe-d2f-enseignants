package esprit.pfe.serviceformation.Microsoft;

import com.microsoft.graph.models.*;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OutlookCalendarService {

    @Autowired
    private MicrosoftGraphClientProvider graphProvider;

    // Création d'un événement avec des participants et récupération de son ID
    public String addEventToCalendarAndReturnId(String organizerEmail, String subject, String htmlContent, OffsetDateTime start, OffsetDateTime end, String salle, List<String> attendeeEmails) {
        GraphServiceClient<Request> graphClient = graphProvider.getGraphClient();

        Event event = new Event();
        event.subject = subject;

        ItemBody body = new ItemBody();
        body.contentType = BodyType.HTML; // Utiliser HTML
        body.content = htmlContent;
        event.body = body;

        DateTimeTimeZone startTime = new DateTimeTimeZone();
        startTime.dateTime = start.toString();
        startTime.timeZone = "Africa/Tunis";
        event.start = startTime;

        DateTimeTimeZone endTime = new DateTimeTimeZone();
        endTime.dateTime = end.toString();
        endTime.timeZone = "Africa/Tunis";
        event.end = endTime;

        Location location = new Location();
        location.displayName = salle;
        event.location = location;

        // Ajout des participants
        if (attendeeEmails != null && !attendeeEmails.isEmpty()) {
            event.attendees = attendeeEmails.stream().map(email -> {
                Attendee attendee = new Attendee();
                EmailAddress emailAddress = new EmailAddress();
                emailAddress.address = email;
                attendee.emailAddress = emailAddress;
                return attendee;
            }).collect(Collectors.toList());
        }

        // L'événement est créé dans le calendrier de l'organisateur
        Event createdEvent = graphClient.users(organizerEmail)
                .events()
                .buildRequest()
                .post(event);
        return createdEvent.id;
    }

    // Mise à jour d'un événement existant avec des participants
    public void updateEventInCalendar(String organizerEmail, String eventId, String subject, String htmlContent, OffsetDateTime start, OffsetDateTime end, String salle, List<String> attendeeEmails) {
        GraphServiceClient<Request> graphClient = graphProvider.getGraphClient();

        Event updatedEvent = new Event();
        updatedEvent.subject = subject;

        ItemBody body = new ItemBody();
        body.contentType = BodyType.HTML; // Utiliser HTML
        body.content = htmlContent;
        updatedEvent.body = body;

        DateTimeTimeZone startTime = new DateTimeTimeZone();
        startTime.dateTime = start.toString();
        startTime.timeZone = "Africa/Tunis";
        updatedEvent.start = startTime;

        DateTimeTimeZone endTime = new DateTimeTimeZone();
        endTime.dateTime = end.toString();
        endTime.timeZone = "Africa/Tunis";
        updatedEvent.end = endTime;

        Location location = new Location();
        location.displayName = salle;
        updatedEvent.location = location;

        // Mise à jour des participants
        if (attendeeEmails != null && !attendeeEmails.isEmpty()) {
            updatedEvent.attendees = attendeeEmails.stream().map(email -> {
                Attendee attendee = new Attendee();
                EmailAddress emailAddress = new EmailAddress();
                emailAddress.address = email;
                attendee.emailAddress = emailAddress;
                return attendee;
            }).collect(Collectors.toList());
        }

        // Requête de mise à jour (PATCH) dans le calendrier de l'organisateur
        graphClient.users(organizerEmail)
                .events(eventId)
                .buildRequest()
                .patch(updatedEvent);
    }

    // La suppression se fait toujours depuis le calendrier de l'organisateur
    public void deleteEventInCalendar(String organizerEmail, String eventId) {
        GraphServiceClient<Request> graphClient = graphProvider.getGraphClient();
        graphClient.users(organizerEmail)
                .events(eventId)
                .buildRequest()
                .delete();
    }

    // Méthode d'ajout sans retour d'ID, si besoin (simple appel de la méthode ci-dessus)
    public void addEventToCalendar(String userEmail, String subject, String content, OffsetDateTime start, OffsetDateTime end, String salle) {
        addEventToCalendarAndReturnId(userEmail, subject, content, start, end, salle, null);
    }
}
