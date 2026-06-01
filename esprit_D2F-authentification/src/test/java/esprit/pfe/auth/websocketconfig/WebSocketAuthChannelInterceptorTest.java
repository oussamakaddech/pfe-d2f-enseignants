package esprit.pfe.auth.websocketconfig;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.security.Principal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

/**
 * Blocker DSI #13 : vérifie que le canal WebSocket exige un JWT valide au CONNECT.
 */
class WebSocketAuthChannelInterceptorTest {

    private JwtDecoder jwtDecoder;
    private WebSocketAuthChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        jwtDecoder = mock(JwtDecoder.class);
        interceptor = new WebSocketAuthChannelInterceptor(jwtDecoder);
    }

    private Message<byte[]> connectMessage(String authHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        // Comme le canal entrant de Spring : headers mutables pour permettre setUser().
        accessor.setLeaveMutable(true);
        if (authHeader != null) {
            accessor.addNativeHeader("Authorization", authHeader);
        }
        return org.springframework.messaging.support.MessageBuilder
                .createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void connectWithoutToken_isRejected() {
        Message<byte[]> message = connectMessage(null);
        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(MessagingException.class);
    }

    @Test
    void connectWithInvalidToken_isRejected() {
        when(jwtDecoder.decode("bad")).thenThrow(new JwtException("invalid"));
        Message<byte[]> message = connectMessage("Bearer bad");
        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(MessagingException.class);
    }

    @Test
    void connectWithValidToken_attachesAuthenticatedPrincipal() {
        Jwt jwt = Jwt.withTokenValue("good")
                .header("alg", "HS512")
                .subject("user-42")
                .claim("scope", "ROLE_ADMIN ROLE_CUP")
                .build();
        when(jwtDecoder.decode("good")).thenReturn(jwt);

        Message<?> result = interceptor.preSend(connectMessage("Bearer good"), null);

        StompHeaderAccessor accessor =
                StompHeaderAccessor.wrap(result);
        Principal user = accessor.getUser();
        assertThat(user).isNotNull();
        assertThat(user.getName()).isEqualTo("user-42");
    }
}
