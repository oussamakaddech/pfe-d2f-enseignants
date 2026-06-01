package esprit.pfe.auth.websocketconfig;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WebSocketConfigTest {

    private WebSocketConfig newConfig() {
        WebSocketAuthChannelInterceptor interceptor =
                new WebSocketAuthChannelInterceptor(mock(JwtDecoder.class));
        WebSocketConfig config = new WebSocketConfig(interceptor);
        ReflectionTestUtils.setField(config, "allowedOriginsRaw",
                "http://localhost:5173,http://localhost:3000");
        return config;
    }

    @Test
    void testConfigureMessageBroker() {
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        newConfig().configureMessageBroker(registry);

        verify(registry).enableSimpleBroker("/topic");
        verify(registry).setApplicationDestinationPrefixes("/app");
    }

    @Test
    void testRegisterStompEndpoints_restrictsOriginsAndUsesSockJs() {
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);

        when(registry.addEndpoint("/ws")).thenReturn(registration);
        when(registration.setAllowedOrigins(any(String[].class))).thenReturn(registration);

        newConfig().registerStompEndpoints(registry);

        verify(registry).addEndpoint("/ws");
        // L'ancien comportement setAllowedOrigins("*") est remplacé par une liste restreinte.
        verify(registration).setAllowedOrigins("http://localhost:5173", "http://localhost:3000");
        verify(registration).withSockJS();
    }

    @Test
    void testInboundChannel_registersAuthInterceptor() {
        ChannelRegistration registration = mock(ChannelRegistration.class);

        newConfig().configureClientInboundChannel(registration);

        verify(registration).interceptors(any(WebSocketAuthChannelInterceptor.class));
    }
}
