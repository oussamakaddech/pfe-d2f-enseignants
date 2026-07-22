package tn.esprit.d2f.mapper;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NotificationMapper - Tests unitaires")
class NotificationMapperTest {

    private final NotificationMapper mapper = new NotificationMapper();

    @Test
    @DisplayName("toEntity() - doit mapper tous les champs correctement")
    void toEntity_shouldMapAllFields() {
        NotificationRequest request = new NotificationRequest(
                "john.doe",
                NotificationType.CERTIFICAT,
                NotificationSeverity.SUCCESS,
                "Certificat disponible",
                "Votre certificat est prêt",
                "/cert/123",
                "Système",
                Map.of("certId", 17L)
        );

        Notification entity = mapper.toEntity(request);

        assertThat(entity).isNotNull();
        assertThat(entity.getRecipient()).isEqualTo("john.doe");
        assertThat(entity.getType()).isEqualTo(NotificationType.CERTIFICAT);
        assertThat(entity.getSeverity()).isEqualTo(NotificationSeverity.SUCCESS);
        assertThat(entity.getTitle()).isEqualTo("Certificat disponible");
        assertThat(entity.getMessage()).isEqualTo("Votre certificat est prêt");
        assertThat(entity.getLink()).isEqualTo("/cert/123");
        assertThat(entity.getActor()).isEqualTo("Système");
        assertThat(entity.isRead()).isFalse();
    }

    @Test
    @DisplayName("toEntity() - doit mettre 'read' à false par défaut")
    void toEntity_shouldSetReadToFalse() {
        NotificationRequest request = new NotificationRequest(
                "admin",
                NotificationType.SYSTEM,
                NotificationSeverity.INFO,
                "System",
                "System message",
                null,
                null,
                Map.of()
        );

        Notification entity = mapper.toEntity(request);

        assertThat(entity.isRead()).isFalse();
    }
}
