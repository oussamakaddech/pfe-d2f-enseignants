package tn.esprit.d2f.websocket;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.WebSocketHandler;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("WebSocketAuthInterceptor - Tests unitaires")
class WebSocketAuthInterceptorTest {

    private final JwtDecoder jwtDecoder = mock(JwtDecoder.class);
    private final WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(jwtDecoder);
    private final WebSocketHandler handler = mock(WebSocketHandler.class);
    private final ServerHttpResponse response = mock(ServerHttpResponse.class);

    private Jwt jwtWith(String email, String username, String sub) {
        return Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject(sub)
                .claim("email", email)
                .claim("preferred_username", username)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
    }

    private ServerHttpRequest requestWithCookie(String cookieHeader) {
        ServerHttpRequest request = mock(ServerHttpRequest.class);
        HttpHeaders headers = new HttpHeaders();
        if (cookieHeader != null) {
            headers.add(HttpHeaders.COOKIE, cookieHeader);
        }
        when(request.getHeaders()).thenReturn(headers);
        return request;
    }

    @Test
    @DisplayName("beforeHandshake - doit rejeter si le cookie JWT est absent")
    void beforeHandshake_shouldRejectMissingCookie() {
        ServerHttpRequest request = requestWithCookie(null);

        boolean accepted = interceptor.beforeHandshake(request, response, handler, new HashMap<>());

        assertThat(accepted).isFalse();
        verify(jwtDecoder, never()).decode(anyString());
    }

    @Test
    @DisplayName("beforeHandshake - doit rejeter si le JWT est invalide")
    void beforeHandshake_shouldRejectInvalidJwt() {
        ServerHttpRequest request = requestWithCookie("d2f_auth_token=bad.token.value");
        when(jwtDecoder.decode("bad.token.value")).thenThrow(new IllegalArgumentException("invalid"));

        boolean accepted = interceptor.beforeHandshake(request, response, handler, new HashMap<>());

        assertThat(accepted).isFalse();
    }

    @Test
    @DisplayName("beforeHandshake - doit stocker l'email comme destinataire si présent")
    void beforeHandshake_shouldUseEmailAsRecipient() {
        ServerHttpRequest request = requestWithCookie("d2f_auth_token=valid");
        when(jwtDecoder.decode("valid")).thenReturn(jwtWith("user@example.com", "user-fallback", "subject-1"));
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = interceptor.beforeHandshake(request, response, handler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes).containsEntry("recipient", "user@example.com");
    }

    @Test
    @DisplayName("beforeHandshake - doit ignorer un email vide et utiliser preferred_username")
    void beforeHandshake_shouldFallbackToUsernameWhenEmailBlank() {
        ServerHttpRequest request = requestWithCookie("d2f_auth_token=valid");
        when(jwtDecoder.decode("valid")).thenReturn(jwtWith("  ", "user-fallback", "subject-1"));
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = interceptor.beforeHandshake(request, response, handler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes).containsEntry("recipient", "user-fallback");
    }

    @Test
    @DisplayName("beforeHandshake - doit ignorer un username vide et utiliser le subject")
    void beforeHandshake_shouldFallbackToSubjectWhenUsernameBlank() {
        ServerHttpRequest request = requestWithCookie("d2f_auth_token=valid");
        when(jwtDecoder.decode("valid")).thenReturn(jwtWith(null, " ", "subject-1"));
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = interceptor.beforeHandshake(request, response, handler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes).containsEntry("recipient", "subject-1");
    }

    @Test
    @DisplayName("beforeHandshake - doit utiliser anonymous si tous les claims sont absents")
    void beforeHandshake_shouldFallbackToAnonymous() {
        ServerHttpRequest request = requestWithCookie("d2f_auth_token=valid");
        when(jwtDecoder.decode("valid")).thenReturn(jwtWith(null, null, null));
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = interceptor.beforeHandshake(request, response, handler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes).containsEntry("recipient", "anonymous");
    }

    @Test
    @DisplayName("extractCookie - doit ignorer les autres cookies et trouver d2f_auth_token")
    void extractCookie_shouldFindTokenAmongOtherCookies() {
        ServerHttpRequest request = requestWithCookie("other=1; d2f_auth_token=the-token; session=abc");
        when(jwtDecoder.decode("the-token")).thenReturn(jwtWith("user@example.com", null, "subject-1"));

        boolean accepted = interceptor.beforeHandshake(request, response, handler, new HashMap<>());

        verify(jwtDecoder).decode("the-token");
        assertThat(accepted).isTrue();
    }

    @Test
    @DisplayName("afterHandshake - ne doit rien faire")
    void afterHandshake_shouldBeNoOp() {
        assertThatCode(() -> interceptor.afterHandshake(null, response, handler, null))
                .doesNotThrowAnyException();
    }
}
