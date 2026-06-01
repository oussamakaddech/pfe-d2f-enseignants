package esprit.pfe.auth.websocketconfig;

import java.util.ArrayList;
import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Blocker DSI #13 : le canal WebSocket/STOMP était ouvert — n'importe qui pouvait
 * établir une connexion et publier sur {@code /topic/notifications}.
 *
 * <p>Cet intercepteur valide le JWT (même jeton HS512 que le reste de l'API) sur la
 * trame STOMP {@code CONNECT}. Toute connexion sans jeton valide est rejetée, et le
 * {@code Principal} authentifié est attaché à la session pour le contrôle d'accès en aval.
 */
@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtDecoder jwtDecoder;

    public WebSocketAuthChannelInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public @NonNull Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // On n'authentifie qu'à l'établissement de la connexion (CONNECT).
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
                throw new MessagingException("WebSocket CONNECT refusé : jeton d'autorisation manquant");
            }

            Jwt jwt;
            try {
                jwt = jwtDecoder.decode(authHeader.substring(BEARER_PREFIX.length()));
            } catch (JwtException e) {
                throw new MessagingException("WebSocket CONNECT refusé : jeton invalide ou expiré");
            }

            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    jwt.getSubject(), null, extractAuthorities(jwt)));
        }
        return message;
    }

    /** Convertit le claim {@code scope} (rôles séparés par des espaces) en autorités Spring Security. */
    private List<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        String scope = jwt.getClaimAsString("scope");
        if (scope != null) {
            for (String role : scope.split("\\s+")) {
                if (!role.isBlank()) {
                    authorities.add(new SimpleGrantedAuthority(role));
                }
            }
        }
        return authorities;
    }
}
