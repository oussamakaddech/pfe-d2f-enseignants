package esprit.pfe.auth.websocketconfig;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.mockito.Mockito.*;

class WebSocketConfigTest {

    @Test
    void testConfigureMessageBroker() {
        WebSocketConfig config = new WebSocketConfig();
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);
        
        config.configureMessageBroker(registry);
        
        verify(registry).enableSimpleBroker("/topic");
        verify(registry).setApplicationDestinationPrefixes("/app");
    }

    @Test
    void testRegisterStompEndpoints() {
        WebSocketConfig config = new WebSocketConfig();
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);
        
        when(registry.addEndpoint("/ws")).thenReturn(registration);
        when(registration.setAllowedOrigins("*")).thenReturn(registration);
        
        config.registerStompEndpoints(registry);
        
        verify(registry).addEndpoint("/ws");
        verify(registration).setAllowedOrigins("*");
        verify(registration).withSockJS();
    }
}
