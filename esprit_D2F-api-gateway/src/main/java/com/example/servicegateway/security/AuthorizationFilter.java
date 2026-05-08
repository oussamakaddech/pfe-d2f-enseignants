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

    private final JwtTokenProvider tokenProvider;

    // ──────────────── Authorization Matrix (path patterns → allowed roles) ────────────────
    // Each entry maps a path prefix + HTTP method pattern to the list of roles that are allowed.
    // The gateway checks these BEFORE forwarding to the downstream service.

    // Role constants
    private static final String ROLE_ADMIN = "admin";
    private static final String ROLE_CUP = "CUP";
    private static final String ROLE_D2F = "D2F";
    private static final String ROLE_ENSEIGNANT = "Enseignant";
    private static final String ROLE_FORMATEUR = "Formateur";
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
            String token = extractToken(exchange);

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

            if (allowedRoles != null && !isRoleAllowed(userRole, allowedRoles)) {
                log.warn("User with role {} attempted unauthorized access to {} {}", userRole, method, path);
                return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
            }

            // ── Forward user info as headers to downstream services ──
            var mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", tokenProvider.getUserId(token))
                    .header("X-User-Role", userRole != null ? userRole : "")
                    .header("X-User-Email", tokenProvider.getUserEmail(token))
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
        if (path.startsWith("/api/besoinsformation/")) return getBesoinRoles(path, method);
        if (path.startsWith("/api/competence/")) return getCompetenceRoles(path, method);
        if (path.startsWith("/api/evaluation/")) return getEvaluationRoles(method);
        if (path.startsWith("/api/certificat/")) return getCertificatRoles(method);
        if (path.startsWith("/api/rice/")) return ADMIN_ONLY;
        if (path.startsWith("/api/ai/")) return ALL_ROLES;
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
            return false;
        }
        // The JWT scope might be a single role like "admin" or "D2F"
        for (String allowed : allowedRoles) {
            if (userRole.contains(allowed)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Extract JWT token from Authorization header
     */
    private String extractToken(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
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
    public static class Config {
        // Configuration properties can be added here if needed
    }
}
