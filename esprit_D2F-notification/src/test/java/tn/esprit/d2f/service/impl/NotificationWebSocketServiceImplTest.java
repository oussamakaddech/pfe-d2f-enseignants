package tn.esprit.d2f.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.WebSocketSession;
import tn.esprit.d2f.dto.NotificationResponse;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;
import tn.esprit.d2f.websocket.NotificationWebSocketHandler;
import tn.esprit.d2f.websocket.WebSocketSessionRegistry;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationWebSocketServiceImpl - Tests unitaires")
class NotificationWebSocketServiceImplTest {

    @Mock
    private WebSocketSessionRegistry registry;

    @Mock
    private NotificationWebSocketHandler handler;

    @Mock
    private WebSocketSession session;

    private ObjectMapper objectMapper;
    private NotificationWebSocketServiceImpl service;
    private NotificationResponse notification;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        service = new NotificationWebSocketServiceImpl(registry, handler, objectMapper);

        notification = new NotificationResponse(
                "1",
                NotificationType.FORMATION,
                NotificationSeverity.INFO,
                "Title",
                "Message",
                false,
                "user1",
                "/link",
                "actor",
                null,
                null
        );
    }

    @Test
    @DisplayName("pushToUser() - doit envoyer la notification sérialisée à la session du destinataire")
    void pushToUser_shouldSendSerializedNotification() {
        Set<WebSocketSession> sessions = new HashSet<>();
        sessions.add(session);
        when(registry.getSessions("user1")).thenReturn(sessions);

        service.pushToUser("user1", notification);

        verify(registry, times(1)).getSessions("user1");
        verify(handler, times(1)).send(eq(session), contains("\"id\":\"1\""));
    }

    @Test
    @DisplayName("pushToUser() - ne doit pas échouer si le destinataire n'a pas de session")
    void pushToUser_shouldHandleNoSessions() {
        when(registry.getSessions("user2")).thenReturn(new HashSet<>());

        service.pushToUser("user2", notification);

        verify(registry, times(1)).getSessions("user2");
        verify(handler, never()).send(eq(session), anyString());
    }

    @Test
    @DisplayName("pushToUsers() - doit dispatcher à plusieurs destinataires")
    void pushToUsers_shouldDispatchToMultipleRecipients() {
        Set<WebSocketSession> sessions1 = new HashSet<>();
        sessions1.add(session);
        Set<WebSocketSession> sessions2 = new HashSet<>();
        sessions2.add(session);
        when(registry.getSessions("user1")).thenReturn(sessions1);
        when(registry.getSessions("user2")).thenReturn(sessions2);

        service.pushToUsers(List.of("user1", "user2"), notification);

        verify(registry, times(1)).getSessions("user1");
        verify(registry, times(1)).getSessions("user2");
        verify(handler, times(2)).send(eq(session), anyString());
    }

    @Test
    @DisplayName("pushToUsers() - doit gérer une liste vide de destinataires")
    void pushToUsers_shouldHandleEmptyList() {
        service.pushToUsers(List.of(), notification);

        verify(registry, never()).getSessions(anyString());
        verify(handler, never()).send(eq(session), anyString());
    }

    @Test
    @DisplayName("pushToUsers() - doit envoyer à plusieurs sessions d'un même destinataire")
    void pushToUsers_shouldSendToMultipleSessionsPerUser() {
        WebSocketSession session2 = mock(WebSocketSession.class);
        Set<WebSocketSession> sessions = new HashSet<>();
        sessions.add(session);
        sessions.add(session2);
        when(registry.getSessions("user1")).thenReturn(sessions);

        service.pushToUsers(List.of("user1"), notification);

        verify(handler, times(2)).send(any(WebSocketSession.class), anyString());
    }
}
