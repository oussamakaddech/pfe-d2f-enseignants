package tn.esprit.d2f.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NotificationResponse - Tests unitaires")
class NotificationResponseTest {

    @Test
    @DisplayName("from() - doit mapper une notification valide")
    void from_shouldMapValidNotification() {
        Notification n = new Notification();
        n.setIdNotification(42L);
        n.setRecipient("admin");
        n.setType(NotificationType.FORMATION);
        n.setSeverity(NotificationSeverity.WARNING);
        n.setTitle("Titre");
        n.setMessage("Message");
        n.setRead(true);
        n.setLink("/link");
        n.setActor("Système");
        n.setCreatedAt(LocalDateTime.of(2026, Month.JULY, 22, 10, 30));

        NotificationResponse response = NotificationResponse.from(n, Map.of("key", "value"));

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo("42");
        assertThat(response.recipient()).isEqualTo("admin");
        assertThat(response.type()).isEqualTo(NotificationType.FORMATION);
        assertThat(response.severity()).isEqualTo(NotificationSeverity.WARNING);
        assertThat(response.title()).isEqualTo("Titre");
        assertThat(response.message()).isEqualTo("Message");
        assertThat(response.read()).isTrue();
        assertThat(response.link()).isEqualTo("/link");
        assertThat(response.actor()).isEqualTo("Système");
        assertThat(response.createdAt()).isEqualTo(LocalDateTime.of(2026, Month.JULY, 22, 10, 30));
        assertThat(response.meta()).containsEntry("key", "value");
    }

    @Test
    @DisplayName("from() - doit retourner null si la notification est null")
    void from_shouldReturnNullForNullNotification() {
        NotificationResponse response = NotificationResponse.from(null, Map.of());
        assertThat(response).isNull();
    }

    @Test
    @DisplayName("from() - doit gérer correctement read=false")
    void from_shouldHandleReadFalse() {
        Notification n = new Notification();
        n.setIdNotification(1L);
        n.setRecipient("user");
        n.setType(NotificationType.SYSTEM);
        n.setSeverity(NotificationSeverity.INFO);
        n.setTitle("T");
        n.setMessage("M");
        n.setRead(false);
        n.setCreatedAt(LocalDateTime.now());

        NotificationResponse response = NotificationResponse.from(n, Map.of());

        assertThat(response.read()).isFalse();
    }

    @Test
    @DisplayName("from() - doit autoriser meta vide ou nul")
    void from_shouldAcceptEmptyMeta() {
        Notification n = new Notification();
        n.setIdNotification(1L);
        n.setType(NotificationType.SYSTEM);
        n.setSeverity(NotificationSeverity.INFO);
        n.setTitle("T");
        n.setMessage("M");
        n.setRead(false);

        NotificationResponse response = NotificationResponse.from(n, Map.of());
        assertThat(response.meta()).isEmpty();
    }
}
