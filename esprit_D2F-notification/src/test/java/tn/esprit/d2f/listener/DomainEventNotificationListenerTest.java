package tn.esprit.d2f.listener;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;
import tn.esprit.d2f.service.INotificationService;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("DomainEventNotificationListener - Tests unitaires")
class DomainEventNotificationListenerTest {

    @Mock
    private INotificationService notificationService;

    @InjectMocks
    private DomainEventNotificationListener listener;

    @Test
    @DisplayName("onNotificationEvent() - doit créer une notification valide")
    void onNotificationEvent_shouldCreateNotification() {
        NotificationRequest request = new NotificationRequest(
                "john.doe",
                NotificationType.FORMATION,
                NotificationSeverity.INFO,
                "Nouvelle formation",
                "Formation disponible",
                "/formation/1",
                "CUP",
                Map.of("formationId", 1L)
        );

        listener.onNotificationEvent(request);

        verify(notificationService, times(1)).create(any(NotificationRequest.class));
    }

    @Test
    @DisplayName("onNotificationEvent() - doit ignorer un événement null")
    void onNotificationEvent_shouldIgnoreNull() {
        listener.onNotificationEvent(null);

        verify(notificationService, never()).create(any());
    }

    @Test
    @DisplayName("onNotificationEvent() - doit ignorer un destinataire vide")
    void onNotificationEvent_shouldIgnoreBlankRecipient() {
        NotificationRequest request = new NotificationRequest(
                "   ",
                NotificationType.SYSTEM,
                NotificationSeverity.INFO,
                "Title",
                "Message",
                null,
                null,
                Map.of()
        );

        listener.onNotificationEvent(request);

        verify(notificationService, never()).create(any());
    }

    @Test
    @DisplayName("onNotificationEvent() - doit ignorer si recipient est null")
    void onNotificationEvent_shouldIgnoreNullRecipient() {
        NotificationRequest request = new NotificationRequest(
                null,
                NotificationType.SYSTEM,
                NotificationSeverity.INFO,
                "Title",
                "Message",
                null,
                null,
                Map.of()
        );

        listener.onNotificationEvent(request);

        verify(notificationService, never()).create(any());
    }
}
