package esprit.pfe.serviceformation.microsoft;

import com.microsoft.graph.models.Event;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OutlookCalendarService - Tests unitaires")
class OutlookCalendarServiceTest {

    @Mock
    private MicrosoftGraphClientProvider graphProvider;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private GraphServiceClient<Request> graphClient;

    @InjectMocks
    private OutlookCalendarService outlookCalendarService;

    @BeforeEach
    void setUp() {
        lenient().when(graphProvider.getGraphClient()).thenReturn(graphClient);
    }

    @Test
    @DisplayName("addEventToCalendarAndReturnIdWithTeamsUrl - Devrait créer un événement")
    void shouldAddEventToCalendar() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .subject("Test Event")
                .htmlContent("Body")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .attendeeEmails(List.of("part1@esprit.tn"))
                .build();

        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";
        com.microsoft.graph.models.OnlineMeetingInfo meeting = new com.microsoft.graph.models.OnlineMeetingInfo();
        meeting.joinUrl = "http://teams/link";
        mockEvent.onlineMeeting = meeting;

        lenient().when(graphClient.users(anyString()).events().buildRequest().post(any()))
                .thenReturn(mockEvent);

        OutlookCalendarService.EventCreationResult result = outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(params);

        assertThat(result.getEventId()).isEqualTo("EVENT123");
        assertThat(result.getJoinUrl()).isEqualTo("http://teams/link");
    }

    @Test
    @DisplayName("updateEventInCalendarWithTeamsUrl - Devrait mettre a jour un événement")
    void shouldUpdateEvent() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .eventId("EVENT123")
                .subject("Updated Event")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .attendeeEmails(List.of("part1@esprit.tn"))
                .build();

        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";

        lenient().when(graphClient.users(anyString()).events(anyString()).buildRequest().patch(any()))
                .thenReturn(mockEvent);

        OutlookCalendarService.EventCreationResult result = outlookCalendarService.updateEventInCalendarWithTeamsUrl(params);

        assertThat(result.getEventId()).isEqualTo("EVENT123");
    }

    @Test
    @DisplayName("deleteEventInCalendar - Devrait supprimer l'événement")
    void shouldDeleteEvent() {
        outlookCalendarService.deleteEventInCalendar("admin@esprit.tn", "EVENT123");
        verify(graphClient.users("admin@esprit.tn").events("EVENT123").buildRequest()).delete();
    }

    @Test
    @DisplayName("deleteEventInCalendar - Devrait gérer les erreurs")
    void shouldHandleDeleteError() {
        // Créer un mock pour la requête de suppression
        com.microsoft.graph.requests.EventRequest eventRequest = mock(com.microsoft.graph.requests.EventRequest.class);
        
        // Configurer le mock pour lever une exception
        doThrow(new RuntimeException("Delete failed")).when(eventRequest).delete();
        
        // Configurer le mock pour retourner notre EventRequest
        when(graphClient.users(anyString()).events(anyString()).buildRequest()).thenReturn(eventRequest);
        
        // Ne devrait pas lever d'exception
        assertDoesNotThrow(() -> outlookCalendarService.deleteEventInCalendar("admin@esprit.tn", "EVENT123"));
    }

    @Test
    @DisplayName("addEventToCalendarAndReturnIdWithTeamsUrl - Devrait gérer les erreurs")
    void shouldHandleAddEventError() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .subject("Test Event")
                .htmlContent("Body")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .build();

        // Créer un mock pour la requête de création
        com.microsoft.graph.requests.EventCollectionRequest eventCollectionRequest = 
            mock(com.microsoft.graph.requests.EventCollectionRequest.class);
        
        // Configurer le mock pour lever une exception
        when(eventCollectionRequest.post(any())).thenThrow(new RuntimeException("Create failed"));
        
        // Configurer le mock pour retourner notre EventCollectionRequest
        when(graphClient.users(anyString()).events().buildRequest()).thenReturn(eventCollectionRequest);

        assertThrows(IllegalStateException.class, () -> outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(params));
    }

    @Test
    @DisplayName("updateEventInCalendarWithTeamsUrl - Devrait gérer les erreurs")
    void shouldHandleUpdateEventError() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .eventId("EVENT123")
                .subject("Updated Event")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .build();

        // Créer un mock pour la requête de mise à jour
        com.microsoft.graph.requests.EventRequest eventRequest = mock(com.microsoft.graph.requests.EventRequest.class);
        
        // Configurer le mock pour lever une exception
        when(eventRequest.patch(any())).thenThrow(new RuntimeException("Update failed"));
        
        // Configurer le mock pour retourner notre EventRequest
        when(graphClient.users(anyString()).events(anyString()).buildRequest()).thenReturn(eventRequest);

        assertThrows(IllegalStateException.class, () -> outlookCalendarService.updateEventInCalendarWithTeamsUrl(params));
    }

    @Test
    @DisplayName("addEventToCalendarAndReturnId - Devrait créer un événement et retourner l'ID")
    void shouldAddEventAndReturnId() {
        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";
        com.microsoft.graph.models.OnlineMeetingInfo meeting = new com.microsoft.graph.models.OnlineMeetingInfo();
        meeting.joinUrl = "http://teams/link";
        mockEvent.onlineMeeting = meeting;

        lenient().when(graphClient.users(anyString()).events().buildRequest().post(any()))
                .thenReturn(mockEvent);

        String result = outlookCalendarService.addEventToCalendarAndReturnId(
                "admin@esprit.tn",
                "Test Event",
                "Body",
                OffsetDateTime.now(),
                OffsetDateTime.now().plusHours(1),
                "S101",
                List.of("part1@esprit.tn")
        );

        assertThat(result).isEqualTo("EVENT123");
    }

    @Test
    @DisplayName("addEventToCalendar - Devrait créer un événement sans retourner l'ID")
    void shouldAddEventWithoutReturningId() {
        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";

        lenient().when(graphClient.users(anyString()).events().buildRequest().post(any()))
                .thenReturn(mockEvent);

        assertDoesNotThrow(() -> outlookCalendarService.addEventToCalendar(
                "admin@esprit.tn",
                "Test Event",
                "Body",
                OffsetDateTime.now(),
                OffsetDateTime.now().plusHours(1),
                "S101"
        ));
    }

    @Test
    @DisplayName("addEventToCalendarAndReturnIdWithTeamsUrl - Devrait créer un événement sans participants")
    void shouldAddEventWithoutAttendees() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .subject("Test Event")
                .htmlContent("Body")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .attendeeEmails(null)
                .build();

        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";
        com.microsoft.graph.models.OnlineMeetingInfo meeting = new com.microsoft.graph.models.OnlineMeetingInfo();
        meeting.joinUrl = "http://teams/link";
        mockEvent.onlineMeeting = meeting;

        lenient().when(graphClient.users(anyString()).events().buildRequest().post(any()))
                .thenReturn(mockEvent);

        OutlookCalendarService.EventCreationResult result = outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(params);

        assertThat(result.getEventId()).isEqualTo("EVENT123");
        assertThat(result.getJoinUrl()).isEqualTo("http://teams/link");
    }

    @Test
    @DisplayName("addEventToCalendarAndReturnIdWithTeamsUrl - Devrait créer un événement sans participants (liste vide)")
    void shouldAddEventWithEmptyAttendees() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .subject("Test Event")
                .htmlContent("Body")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .attendeeEmails(List.of())
                .build();

        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";
        com.microsoft.graph.models.OnlineMeetingInfo meeting = new com.microsoft.graph.models.OnlineMeetingInfo();
        meeting.joinUrl = "http://teams/link";
        mockEvent.onlineMeeting = meeting;

        lenient().when(graphClient.users(anyString()).events().buildRequest().post(any()))
                .thenReturn(mockEvent);

        OutlookCalendarService.EventCreationResult result = outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(params);

        assertThat(result.getEventId()).isEqualTo("EVENT123");
        assertThat(result.getJoinUrl()).isEqualTo("http://teams/link");
    }

    @Test
    @DisplayName("updateEventInCalendarWithTeamsUrl - Devrait mettre à jour un événement sans participants")
    void shouldUpdateEventWithoutAttendees() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .eventId("EVENT123")
                .subject("Updated Event")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .attendeeEmails(null)
                .build();

        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";

        lenient().when(graphClient.users(anyString()).events(anyString()).buildRequest().patch(any()))
                .thenReturn(mockEvent);

        OutlookCalendarService.EventCreationResult result = outlookCalendarService.updateEventInCalendarWithTeamsUrl(params);

        assertThat(result.getEventId()).isEqualTo("EVENT123");
    }

    @Test
    @DisplayName("addEventToCalendarAndReturnIdWithTeamsUrl - Devrait créer un événement sans URL Teams")
    void shouldAddEventWithoutTeamsUrl() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .subject("Test Event")
                .htmlContent("Body")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .build();

        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";
        mockEvent.onlineMeeting = null;

        lenient().when(graphClient.users(anyString()).events().buildRequest().post(any()))
                .thenReturn(mockEvent);

        OutlookCalendarService.EventCreationResult result = outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(params);

        assertThat(result.getEventId()).isEqualTo("EVENT123");
        assertThat(result.getJoinUrl()).isNull();
    }

    @Test
    @DisplayName("updateEventInCalendarWithTeamsUrl - Devrait mettre à jour un événement sans URL Teams")
    void shouldUpdateEventWithoutTeamsUrl() {
        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail("admin@esprit.tn")
                .eventId("EVENT123")
                .subject("Updated Event")
                .start(OffsetDateTime.now())
                .end(OffsetDateTime.now().plusHours(1))
                .build();

        Event mockEvent = new Event();
        mockEvent.id = "EVENT123";
        mockEvent.onlineMeeting = null;

        lenient().when(graphClient.users(anyString()).events(anyString()).buildRequest().patch(any()))
                .thenReturn(mockEvent);

        OutlookCalendarService.EventCreationResult result = outlookCalendarService.updateEventInCalendarWithTeamsUrl(params);

        assertThat(result.getEventId()).isEqualTo("EVENT123");
        assertThat(result.getJoinUrl()).isNull();
    }
}
