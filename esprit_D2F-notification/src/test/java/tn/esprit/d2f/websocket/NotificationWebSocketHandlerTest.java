package tn.esprit.d2f.websocket;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationWebSocketHandler & Registry - Tests unitaires")
class NotificationWebSocketHandlerTest {

    private WebSocketSessionRegistry concreteRegistry;
    private NotificationWebSocketHandler handler;

    @BeforeEach
    void setUp() {
        concreteRegistry = new WebSocketSessionRegistry();
        handler = new NotificationWebSocketHandler(concreteRegistry);
    }

    @Test
    @DisplayName("Registry - register puis getSessions doit renvoyer la session")
    void registry_registerAndGet() {
        WebSocketSession session = mock(WebSocketSession.class);

        concreteRegistry.register("user1", session);

        Set<WebSocketSession> sessions = concreteRegistry.getSessions("user1");
        assertThat(sessions).contains(session);
    }

    @Test
    @DisplayName("Registry - getSessions d'un destinataire inconnu doit renvoyer vide")
    void registry_getUnknownRecipientReturnsEmpty() {
        Set<WebSocketSession> sessions = concreteRegistry.getSessions("unknown");
        assertThat(sessions).isEmpty();
    }

    @Test
    @DisplayName("Registry - unregister doit supprimer la session")
    void registry_unregister() {
        WebSocketSession session = mock(WebSocketSession.class);
        concreteRegistry.register("user1", session);

        concreteRegistry.unregister("user1", session);

        assertThat(concreteRegistry.getSessions("user1")).isEmpty();
    }

    @Test
    @DisplayName("Registry - unregister doit nettoyer le recipient si vide")
    void registry_unregisterCleansRecipient() throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        concreteRegistry.register("user1", session);
        concreteRegistry.unregister("user1", session);

        Field field = WebSocketSessionRegistry.class.getDeclaredField("sessionsByRecipient");
        field.setAccessible(true);
        java.util.concurrent.ConcurrentHashMap<String, Set<WebSocketSession>> internal =
                (java.util.concurrent.ConcurrentHashMap<String, Set<WebSocketSession>>) field.get(concreteRegistry);

        assertThat(internal).doesNotContainKey("user1");
    }

    @Test
    @DisplayName("Registry - unregister d'un destinataire inexistant doit être no-op")
    void registry_unregisterUnknown() {
        concreteRegistry.unregister("unknown", mock(WebSocketSession.class));
        assertThat(concreteRegistry.getSessions("unknown")).isEmpty();
    }

    @Test
    @DisplayName("Registry - doit gérer plusieurs sessions pour le même destinataire")
    void registry_multipleSessionsPerRecipient() {
        WebSocketSession s1 = mock(WebSocketSession.class);
        WebSocketSession s2 = mock(WebSocketSession.class);

        concreteRegistry.register("user1", s1);
        concreteRegistry.register("user1", s2);

        assertThat(concreteRegistry.getSessions("user1")).containsExactlyInAnyOrder(s1, s2);
    }

    @Test
    @DisplayName("Handler - afterConnectionEstablished doit register si recipient présent")
    void handler_connectionEstablished_registersRecipient() {
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("recipient", "userX");
        when(session.getAttributes()).thenReturn(attributes);

        handler.afterConnectionEstablished(session);

        assertThat(concreteRegistry.getSessions("userX")).contains(session);
    }

    @Test
    @DisplayName("Handler - afterConnectionEstablished sans recipient doit être no-op")
    void handler_connectionEstablished_noRecipient() {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getAttributes()).thenReturn(new HashMap<>());

        handler.afterConnectionEstablished(session);

        assertThat(concreteRegistry.getSessions("anyRecipient")).isEmpty();
    }

    @Test
    @DisplayName("Handler - afterConnectionClosed doit unregister si recipient présent")
    void handler_connectionClosed_unregistersRecipient() {
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("recipient", "userX");
        when(session.getAttributes()).thenReturn(attributes);

        concreteRegistry.register("userX", session);
        handler.afterConnectionClosed(session, CloseStatus.NORMAL);

        assertThat(concreteRegistry.getSessions("userX")).isEmpty();
    }

    @Test
    @DisplayName("Handler - afterConnectionClosed sans recipient doit être no-op")
    void handler_connectionClosed_noRecipient() {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getAttributes()).thenReturn(new HashMap<>());

        handler.afterConnectionClosed(session, CloseStatus.NORMAL);

        assertThat(concreteRegistry.getSessions("anyRecipient")).isEmpty();
    }

    @Test
    @DisplayName("Handler - send doit envoyer un TextMessage si la session est ouverte")
    void handler_send_openSession() throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.isOpen()).thenReturn(true);
        doNothing().when(session).sendMessage(any());

        handler.send(session, "{\"hello\":\"world\"}");

        verify(session, times(1)).sendMessage(new TextMessage("{\"hello\":\"world\"}"));
    }

    @Test
    @DisplayName("Handler - send doit être no-op si la session est fermée")
    void handler_send_closedSession() throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.isOpen()).thenReturn(false);

        handler.send(session, "{\"hello\":\"world\"}");

        verify(session, never()).sendMessage(any());
    }

    @Test
    @DisplayName("Handler - send doit swallow l'exception si sendMessage échoue")
    void handler_send_swallowsException() throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.isOpen()).thenReturn(true);
        doThrow(new IOException("boom")).when(session).sendMessage(any());

        handler.send(session, "{\"hello\":\"world\"}");

        verify(session, times(1)).sendMessage(any());
    }

    private static <T> T any() {
        return org.mockito.ArgumentMatchers.any();
    }
}
