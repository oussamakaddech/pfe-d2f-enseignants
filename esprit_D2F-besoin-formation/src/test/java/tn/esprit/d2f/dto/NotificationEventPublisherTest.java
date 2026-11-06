package tn.esprit.d2f.dto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    private NotificationEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new NotificationEventPublisher(rabbitTemplate);
        org.springframework.test.util.ReflectionTestUtils.setField(
                publisher, "notificationsExchange", "d2f.notifications");
    }

    @Test
    @SuppressWarnings("unchecked")
    void publish_envoiePayloadConformeAuContrat() {
        publisher.publish("cup1", "Titre", "Message", "/besoins/1", "admin");

        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(rabbitTemplate, times(1)).convertAndSend(eq("d2f.notifications"), eq(""), payload.capture());
        Map<String, Object> body = payload.getValue();
        assertEquals("cup1", body.get("recipient"));
        assertEquals("BESOIN", body.get("type"));
        assertEquals("INFO", body.get("severity"));
        assertEquals("Titre", body.get("title"));
        assertEquals("Message", body.get("message"));
    }

    @Test
    void publish_destinataireVide_nePublieRien() {
        publisher.publish("  ", "Titre", "Message", null, null);
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class));
    }

    @Test
    void publish_erreurBroker_neLevePas() {
        doThrow(new RuntimeException("broker down")).when(rabbitTemplate)
                .convertAndSend(anyString(), anyString(), any(Object.class));
        assertDoesNotThrow(() -> publisher.publish("cup1", "Titre", "Message", null, null));
    }
}
