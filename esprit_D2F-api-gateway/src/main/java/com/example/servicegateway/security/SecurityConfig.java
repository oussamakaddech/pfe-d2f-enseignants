package com.example.servicegateway.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.authentication.AuthenticationWebFilter;
import org.springframework.security.web.server.authentication.ServerAuthenticationConverter;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

/**
 * Spring Security (WebFlux) — verrou « deny-by-default » de la gateway.
 *
 * <p>Contrairement à {@link AuthorizationFilter} qui s'attache route par route (et peut donc
 * être oublié sur une nouvelle route), cette configuration applique la règle au niveau du
 * framework : <b>toute</b> requête qui n'est pas explicitement publique exige un JWT valide.
 * {@link AuthorizationFilter} reste en place pour le contrôle d'accès fin (matrice rôles ↔ chemins).
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    /** Endpoints accessibles sans authentification (doit refléter AuthorizationFilter#isPublicEndpoint). */
    private static final String[] PUBLIC_PATHS = {
            "/api/auth/login",
            "/api/auth/signup",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/confirm",
            "/api/auth/logout",
            "/actuator/**",
            "/fallback/**"
    };

    private static final String AUTH_COOKIE = "d2f_auth_token";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider tokenProvider;

    public SecurityConfig(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
                // API stateless protégée par JWT : pas de CSRF/session/login form.
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .logout(ServerHttpSecurity.LogoutSpec::disable)
                // CORS géré par la globalcors de Spring Cloud Gateway.
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers(HttpMethod.OPTIONS).permitAll()
                        .pathMatchers(PUBLIC_PATHS).permitAll()
                        .anyExchange().authenticated())
                .addFilterAt(jwtAuthenticationWebFilter(), SecurityWebFiltersOrder.AUTHENTICATION)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((exchange, denied) -> writeStatus(exchange, HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler((exchange, denied) -> writeStatus(exchange, HttpStatus.FORBIDDEN)));
        return http.build();
    }

    private AuthenticationWebFilter jwtAuthenticationWebFilter() {
        AuthenticationWebFilter filter = new AuthenticationWebFilter(jwtAuthenticationManager());
        filter.setServerAuthenticationConverter(jwtAuthenticationConverter());
        // Jeton présent mais rejeté (signature/expiration) → 401 explicite.
        // Sans ce handler, l'échec d'authentification remonterait en 500.
        filter.setAuthenticationFailureHandler((webFilterExchange, exception) ->
                writeStatus(webFilterExchange.getExchange(), HttpStatus.UNAUTHORIZED));
        return filter;
    }

    /** Valide le JWT et construit l'{@code Authentication} avec les autorités issues du claim {@code scope}. */
    private ReactiveAuthenticationManager jwtAuthenticationManager() {
        return authentication -> {
            String token = (String) authentication.getCredentials();
            if (token == null || !tokenProvider.isValidToken(token)) {
                // Jeton présent mais invalide/expiré → AuthenticationException → 401 via failure handler.
                return Mono.error(new BadCredentialsException("Invalid or expired token"));
            }
            List<GrantedAuthority> authorities = new ArrayList<>();
            String scope = tokenProvider.getUserRole(token);
            if (scope != null) {
                for (String role : scope.split("\\s+")) {
                    if (!role.isBlank()) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    }
                }
            }
            String userId = tokenProvider.getUserId(token);
            return Mono.just(new UsernamePasswordAuthenticationToken(userId, token, authorities));
        };
    }

    /** Extrait le jeton (header Authorization puis cookie HttpOnly) en un token d'authentification non vérifié. */
    private ServerAuthenticationConverter jwtAuthenticationConverter() {
        return exchange -> {
            String token = extractToken(exchange);
            if (token == null) {
                return Mono.empty();
            }
            return Mono.just(new UsernamePasswordAuthenticationToken(null, token));
        };
    }

    private String extractToken(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        HttpCookie cookie = exchange.getRequest().getCookies().getFirst(AUTH_COOKIE);
        if (cookie != null && !cookie.getValue().isBlank()) {
            return cookie.getValue();
        }
        return null;
    }

    private Mono<Void> writeStatus(ServerWebExchange exchange, HttpStatus status) {
        exchange.getResponse().setStatusCode(status);
        return exchange.getResponse().setComplete();
    }
}
