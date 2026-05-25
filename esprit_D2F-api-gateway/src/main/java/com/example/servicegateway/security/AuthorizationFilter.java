package com.example.servicegateway.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Gateway Authorization Filter
 * Validates JWT tokens and checks role-based authorization at the gateway level.
 * Implements the complete authorization matrix for all microservices.
 *
 * Roles : admin, CUP, D2F, Enseignant, Formateur
 */
@Slf4j
@Component
public class AuthorizationFilter extends AbstractGatewayFilterFactory<AuthorizationFilter.Config> {

    /** Configuration for the authorization filter. Must be a concrete class — Spring Cloud Gateway instantiates it via reflection. */
    public static class Config {
        private String authHeaderPrefix = "Bearer ";

        public String getAuthHeaderPrefix() { return authHeaderPrefix; }
        public void setAuthHeaderPrefix(String authHeaderPrefix) { this.authHeaderPrefix = authHeaderPrefix; }
    }

    private final JwtTokenProvider tokenProvider;

    // ──────────────── Authorization Matrix (path patterns → allowed roles) ────────────────
    // Each entry maps a path prefix + HTTP method pattern to the list of roles that are allowed.
    // The gateway checks these BEFORE forwarding to the downstream service.

    // Role constants
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_CUP = "CUP";
    private static final String ROLE_D2F = "D2F";
    private static final String ROLE_ENSEIGNANT = "ENSEIGNANT";
    private static final String ROLE_FORMATEUR = "FORMATEUR";
    private static final String ROLE_CHEF_DEPARTEMENT = "CHEF_DEPARTEMENT";
    private static final String ROLE_RESPONSABLE_DOSSIER = "RESPONSABLE_DOSSIER";

    /** All authenticated users */
    private static final List<String> ALL_ROLES = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_ENSEIGNANT, ROLE_FORMATEUR, 
        ROLE_CHEF_DEPARTEMENT, ROLE_RESPONSABLE_DOSSIER
    );

    /** Admin only */
    private static final List<String> ADMIN_ONLY = List.of(ROLE_ADMIN);

    /** Admin + CUP + D2F + Chef de département */
    private static final List<String> ADMIN_CUP = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_CHEF_DEPARTEMENT
    );

    /** Admin + CUP + D2F + Enseignant + Chef de département */
    private static final List<String> NO_FORMATEUR = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_ENSEIGNANT, ROLE_CHEF_DEPARTEMENT
    );

    /** Admin + Formateur */
    private static final List<String> ADMIN_FORMATEUR = List.of(ROLE_ADMIN, ROLE_FORMATEUR);

    /** Admin + CUP + D2F + Chef de département */
    private static final List<String> ADMIN_CUP_D2F_CHEF = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_CHEF_DEPARTEMENT
    );

    /** Admin + CUP + D2F + Enseignant + Chef de département */
    private static final List<String> ADMIN_CUP_D2F_ENSEIGNANT_CHEF = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_ENSEIGNANT, ROLE_CHEF_DEPARTEMENT
    );

    /** Admin + CUP + Enseignant */
    private static final List<String> ADMIN_CUP_ENSEIGNANT = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_ENSEIGNANT
    );

    public AuthorizationFilter(JwtTokenProvider tokenProvider) {
        super(Config.class);
        this.tokenProvider = tokenProvider;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            // Use the original request path, before any RewritePath or StripPrefix filters were applied
            String path = exchange.getRequest().getPath().value();
            java.util.LinkedHashSet<java.net.URI> uris = exchange.getAttribute(
                    org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ORIGINAL_REQUEST_URL_ATTR);
            if (uris != null && !uris.isEmpty()) {
                path = uris.iterator().next().getPath();
            }
            HttpMethod method = exchange.getRequest().getMethod();

            // ── Public endpoints and OPTIONS requests (no token required) ──
            if (HttpMethod.OPTIONS.equals(method) || isPublicEndpoint(path)) {
                return chain.filter(exchange);
            }

            // ── Extract & validate JWT ──
            String token = extractToken(exchange, config);

            if (token == null) {
                log.warn("No JWT token found in request: {}", path);
                return onError(exchange, "Missing authorization token", HttpStatus.UNAUTHORIZED);
            }

            if (!tokenProvider.isValidToken(token)) {
                log.warn("Invalid JWT token for request: {}", path);
                return onError(exchange, "Invalid or expired token", HttpStatus.UNAUTHORIZED);
            }

            // ── Role-based authorization ──
            String userRole = tokenProvider.getUserRole(token);
            List<String> allowedRoles = determineAllowedRoles(path, method);

            log.debug("AUTH CHECK: path={}, method={}, role={}", path, method, userRole);

            if (allowedRoles != null && !isRoleAllowed(userRole, allowedRoles)) {
                log.warn("AUTH DENIED: userRole={} not in allowedRoles={} for {} {}", userRole, allowedRoles, method, path);
                return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
            }

            // ── Forward user info as headers to downstream services ──
            // Authorization is set (not added) to avoid duplicates when the original
            // request already carried a Bearer header (mobile clients).
            var mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", tokenProvider.getUserId(token))
                    .header("X-User-Role", userRole != null ? userRole : "")
                    .header("X-User-Email", tokenProvider.getUserEmail(token))
                    .headers(h -> h.set("Authorization", "Bearer " + token))
                    .build();

            ServerWebExchange mutatedExchange = exchange.mutate().request(mutatedRequest).build();

            log.debug("Authorization OK: user={} role={} → {} {}",
                    tokenProvider.getUserId(token), userRole, method, path);

            return chain.filter(mutatedExchange);
        };
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  PUBLIC ENDPOINTS
    // ────────────────────────────────────────────────────────────────────────────

    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/signup")
                || path.startsWith("/api/auth/forgot-password")
                || path.startsWith("/api/auth/reset-password")
                || path.startsWith("/api/auth/confirm")
                || path.startsWith("/api/auth/logout")
                || path.startsWith("/actuator/");
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  AUTHORIZATION MATRIX
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * Return the list of allowed roles for a given path + method,
     * or null to allow any authenticated user.
     */
    private List<String> determineAllowedRoles(String path, HttpMethod method) {
        if (path.startsWith("/api/auth/")) return getAuthRoles(path);
        if (path.startsWith("/api/account/")) return getAccountRoles(path);
        if (path.startsWith("/api/formation/")) return getFormationRoles(path, method);
        if (path.startsWith("/api/besoins-formation/") || path.startsWith("/api/besoinsformation/")) return getBesoinRoles(path, method);
        if (path.startsWith("/api/competence/")) return getCompetenceRoles(path, method);
        if (path.startsWith("/api/evaluation/")) return getEvaluationRoles(method);
        if (path.startsWith("/api/certificat/")) return getCertificatRoles(method);
        if (path.startsWith("/api/rice/")) return ADMIN_ONLY;
        if (path.startsWith("/api/analyse/")) return getAnalyseRoles(path);

        return ALL_ROLES;
    }

    private List<String> getAuthRoles(String path) {
        if (path.contains("/profile") || path.contains("/edit-profile") || path.contains("/update-password")) {
            return ALL_ROLES;
        }
        if (path.contains("/list-accounts") || path.contains("/ban-account") || path.contains("/enable-account") 
                || path.contains("/delete/") || path.contains("/update/")) {
            return ADMIN_ONLY;
        }
        return ALL_ROLES;
    }

    private List<String> getAccountRoles(String path) {
        return getAuthRoles(path); // Same logic for account
    }

    private List<String> getFormationRoles(String path, HttpMethod method) {
        if (path.contains("/kpi")) return NO_FORMATEUR;
        if (method == HttpMethod.DELETE) return ADMIN_ONLY;
        if (path.contains("/inscription/inscriptions") && method == HttpMethod.POST) return ALL_ROLES;
        if (method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH) return ADMIN_CUP;
        return ALL_ROLES;
    }

    private List<String> getBesoinRoles(String path, HttpMethod method) {
        if (path.contains("/approve")) return ADMIN_CUP;
        if (method == HttpMethod.DELETE) return ADMIN_ONLY;
        if (path.contains("/modify") && method == HttpMethod.PUT) return ADMIN_ONLY;
        if (method == HttpMethod.POST) return ADMIN_CUP_ENSEIGNANT;
        return ALL_ROLES;
    }

    private List<String> getCompetenceRoles(String path, HttpMethod method) {
        if (path.contains("/rice") || method == HttpMethod.DELETE || method == HttpMethod.POST 
                || method == HttpMethod.PUT || method == HttpMethod.PATCH) return ADMIN_ONLY;
        return NO_FORMATEUR;
    }

    private List<String> getEvaluationRoles(HttpMethod method) {
        if (method == HttpMethod.DELETE) return ADMIN_ONLY;
        if (method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH) return ADMIN_FORMATEUR;
        return ALL_ROLES;
    }

    private List<String> getCertificatRoles(HttpMethod method) {
        if (method == HttpMethod.DELETE || method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH) return ADMIN_ONLY;
        return ALL_ROLES;
    }

    private List<String> getAnalyseRoles(String path) {
        if (path.contains("/predict/train")) return ADMIN_ONLY;
        if (path.contains("/dashboard/") || path.contains("/detect/")) return ADMIN_CUP_D2F_CHEF;
        return ADMIN_CUP_D2F_ENSEIGNANT_CHEF;
    }

    /**
     * Check if userRole is in the allowed roles list.
     * The scope claim may contain space-separated roles.
     */
    private boolean isRoleAllowed(String userRole, List<String> allowedRoles) {
        if (userRole == null || userRole.isBlank()) {
            log.debug("isRoleAllowed: userRole is null or blank");
            return false;
        }

        // Admin has access to everything (Superuser)
        if (userRole.contains(ROLE_ADMIN)) {
            log.debug("isRoleAllowed: userRole contains ROLE_ADMIN ({})", ROLE_ADMIN);
            return true;
        }

        for (String allowed : allowedRoles) {
            if (userRole.contains(allowed)) {
                log.debug("isRoleAllowed: userRole contains allowed role ({})", allowed);
                return true;
            }
        }
        log.debug("isRoleAllowed: NO MATCH found for userRole={} in allowedRoles={}", userRole, allowedRoles);
        return false;
    }

    /**
     * Extract JWT token from Authorization header or d2f_auth_token cookie.
     * Priority: 1) Authorization header (mobile compat) 2) HttpOnly cookie (web)
     */
    private String extractToken(ServerWebExchange exchange, Config config) {
        // 1) Try Authorization header first (mobile / API clients)
        String prefix = config.getAuthHeaderPrefix();
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith(prefix)) {
            return authHeader.substring(prefix.length());
        }

        // 2) Fallback: try HttpOnly cookie (web browser)
        org.springframework.http.HttpCookie cookie = exchange.getRequest()
                .getCookies()
                .getFirst("d2f_auth_token");
        if (cookie != null && !cookie.getValue().isBlank()) {
            return cookie.getValue();
        }

        return null;
    }

    /**
     * Handle authorization errors
     */
    private Mono<Void> onError(ServerWebExchange exchange, String errorMessage, HttpStatus httpStatus) {
        var response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        response.getHeaders().add("Content-Type", "application/json");

        String errorBody = String.format(
            "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"path\":\"%s\"}",
            java.time.Instant.now().toString(),
            httpStatus.value(),
            errorMessage,
            exchange.getRequest().getPath().value()
        );

        DataBufferFactory bufferFactory = response.bufferFactory();
        return response.writeWith(Mono.just(bufferFactory.wrap(errorBody.getBytes())));
    }

}
