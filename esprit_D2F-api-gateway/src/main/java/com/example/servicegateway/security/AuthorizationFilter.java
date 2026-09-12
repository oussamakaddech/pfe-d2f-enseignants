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
 * Roles : admin, CUP, Enseignant, Formateur, Animateur, ChefDepartement, ResponsableDossier
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

    // Role constants — MUST match the ROLE_-prefixed authorities emitted in the JWT
    // "scope" claim (see esprit.d2f.common.security.AuthorizationMatrix) so that
    // exact-match comparison is possible and substring false-positives are avoided.
    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_CUP = "ROLE_CUP";
    private static final String ROLE_D2F = "ROLE_D2F";
    private static final String ROLE_ENSEIGNANT = "ROLE_ENSEIGNANT";
    private static final String ROLE_FORMATEUR = "ROLE_FORMATEUR";
    private static final String ROLE_ANIMATEUR = "ROLE_ANIMATEUR";
    private static final String ROLE_CHEF_DEPARTEMENT = "ROLE_CHEF_DEPARTEMENT";
    private static final String ROLE_RESPONSABLE_DOSSIER = "ROLE_RESPONSABLE_DOSSIER";

    /** All authenticated users */
    private static final List<String> ALL_ROLES = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_ENSEIGNANT, ROLE_FORMATEUR, ROLE_ANIMATEUR,
        ROLE_CHEF_DEPARTEMENT, ROLE_RESPONSABLE_DOSSIER
    );

    /** Admin only */
    private static final List<String> ADMIN_ONLY = List.of(ROLE_ADMIN);

    /** Admin + CUP + D2F + Chef de département */
    private static final List<String> ADMIN_CUP = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_CHEF_DEPARTEMENT
    );

    /** Pilotage (dashboard/BFF analytics) : ADMIN + CUP + Chef de département.
     *  Parité guard frontend routes/index.tsx et @PreAuthorize AnalyticsController. */
    private static final List<String> PILOTAGE_ROLES = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_CHEF_DEPARTEMENT
    );

    /** Admin + CUP + Enseignant + Chef de département + Animateur + D2F + Responsable dossier */
    private static final List<String> NO_FORMATEUR = List.of(
        ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_ENSEIGNANT, ROLE_ANIMATEUR,
        ROLE_CHEF_DEPARTEMENT, ROLE_RESPONSABLE_DOSSIER
    );

    /** Admin + Formateur/Animateur + Enseignant */
    private static final List<String> ADMIN_FORMATEUR = List.of(ROLE_ADMIN, ROLE_FORMATEUR, ROLE_ANIMATEUR, ROLE_ENSEIGNANT);

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
                || path.startsWith("/actuator/")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-ui")
                || path.equals("/swagger-ui.html");
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
        if (path.startsWith("/api/rice/")) return getRiceRoles(method);
        if (path.startsWith("/api/analyse/")) return getAnalyseRoles(path);
        // BFF analyse predictive (vues consolidees de pilotage) : ADMIN/CUP/Chef de département.
        if (path.startsWith("/api/v1/analyse-predictive/") || path.startsWith("/api/v2/analytics/"))
            return PILOTAGE_ROLES;

        return ALL_ROLES;
    }

    private List<String> getAuthRoles(String path) {
        if (path.contains("/profile") || path.contains("/edit-profile") || path.contains("/update-password")) {
            return ALL_ROLES;
        }
        // NB : « delete/ » (sans slash initial) couvre À LA FOIS la suppression
        // logique (/delete/{id}) ET la suppression définitive (/permanent-delete/{id}).
        // Un « /delete/ » strict raterait permanent-delete (caractère « - » avant
        // « delete »), laissant la route retomber sur ALL_ROLES au niveau gateway.
        if (path.contains("/list-accounts") || path.contains("/ban-account") || path.contains("/enable-account")
                || path.contains("/create-account")
                || path.contains("delete/") || path.contains("/update/")) {
            return ADMIN_ONLY;
        }
        return ALL_ROLES;
    }

    private List<String> getAccountRoles(String path) {
        if (path.contains("/list-accounts")) return List.of(ROLE_ADMIN, ROLE_CUP, ROLE_ANIMATEUR, ROLE_CHEF_DEPARTEMENT);
        return getAuthRoles(path);
    }

    private List<String> getFormationRoles(String path, HttpMethod method) {
        if (path.contains("/kpi")) return NO_FORMATEUR;
        // ── Documents de formation ────────────────────────────────────────────
        // Parité avec AuthorizationMatrix.DOCUMENT_* : le RESPONSABLE_DOSSIER gère
        // les documents (création/mise à jour/suppression) au même titre que ADMIN
        // et CUP (cahier des charges, US#47). Les GET/DOWNLOAD restent FORMATION_READ.
        if (path.contains("/documents")) {
            if (method == HttpMethod.POST || method == HttpMethod.PUT
                    || method == HttpMethod.PATCH || method == HttpMethod.DELETE) {
                return List.of(ROLE_ADMIN, ROLE_CUP, ROLE_RESPONSABLE_DOSSIER);
            }
            return ALL_ROLES;
        }
        if (method == HttpMethod.DELETE) return ADMIN_ONLY;
        if (path.contains("/inscription/inscriptions") && method == HttpMethod.POST) return ALL_ROLES;
        // Présences d'une séance : marquage autorisé à l'animateur/formateur de la
        // séance (parité avec AuthorizationMatrix.PRESENCE_MARK). Le contrôle fin
        // (appartenance à la séance) est fait par le microservice formation.
        if ((path.contains("/presences") || path.contains("/presence/"))
                && (method == HttpMethod.PUT || method == HttpMethod.PATCH))
            return List.of(ROLE_ADMIN, ROLE_CUP, ROLE_RESPONSABLE_DOSSIER,
                    ROLE_FORMATEUR, ROLE_ANIMATEUR, ROLE_ENSEIGNANT);
        if (method == HttpMethod.POST) return List.of(ROLE_ADMIN, ROLE_CUP, ROLE_D2F);
        // FORMATION_UPDATE = ADMIN, CUP, RESPONSABLE_DOSSIER (cf. AuthorizationMatrix)
        if (method == HttpMethod.PUT || method == HttpMethod.PATCH)
            return List.of(ROLE_ADMIN, ROLE_CUP, ROLE_RESPONSABLE_DOSSIER);
        return ALL_ROLES;
    }

    private List<String> getBesoinRoles(String path, HttpMethod method) {
        // Workflow : approve + reject réservés aux valideurs (ADMIN/CUP/D2F/Chef).
        // Le contrôle fin (étape, périmètre, créateur ≠ décideur) est fait par le microservice.
        if (path.contains("/approve") || path.contains("/reject")) return ADMIN_CUP;
        // Annulation : tout authentifié peut appeler, le service vérifie
        // créateur-ou-admin (parité BESOIN_FORMATION_CANCEL).
        if (path.contains("/cancel")) return ALL_ROLES;
        // Périmètres validateurs : ADMIN uniquement.
        if (path.contains("/reviewer-scopes") && !path.contains("/reviewer-scopes/me")) return ADMIN_ONLY;
        if (method == HttpMethod.DELETE) return List.of(ROLE_ADMIN, ROLE_ENSEIGNANT, ROLE_ANIMATEUR);
        if (path.contains("/modify") && method == HttpMethod.PUT) return List.of(ROLE_ADMIN, ROLE_ENSEIGNANT, ROLE_ANIMATEUR);
        if (method == HttpMethod.PUT) return List.of(ROLE_ADMIN, ROLE_ENSEIGNANT, ROLE_ANIMATEUR);
        if (method == HttpMethod.POST) return List.of(ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_ENSEIGNANT, ROLE_ANIMATEUR);
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

    private List<String> getRiceRoles(HttpMethod method) {
        if (method == HttpMethod.GET) return List.of(ROLE_ADMIN, ROLE_CUP, ROLE_CHEF_DEPARTEMENT);
        return ADMIN_ONLY;
    }

    private List<String> getAnalyseRoles(String path) {
        if (path.contains("/predict/train")) return ADMIN_ONLY;
        if (path.contains("/dashboard/") || path.contains("/detect/")) return ADMIN_CUP;
        return NO_FORMATEUR;
    }

    /**
     * Check if one of the user's roles (parsed from the space-separated JWT "scope"
     * claim, e.g. "ROLE_ADMIN ROLE_CUP") exactly matches an allowed role.
     * Exact matching prevents substring false-positives (e.g. "READMIN").
     */
    private boolean isRoleAllowed(String userRole, List<String> allowedRoles) {
        if (userRole == null || userRole.isBlank()) {
            log.debug("isRoleAllowed: userRole is null or blank");
            return false;
        }

        java.util.Set<String> userRoles = java.util.Arrays.stream(userRole.split(" "))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(java.util.stream.Collectors.toSet());

        // Admin has access to everything (Superuser)
        if (userRoles.contains(ROLE_ADMIN)) {
            log.debug("isRoleAllowed: user is ROLE_ADMIN (superuser)");
            return true;
        }

        for (String allowed : allowedRoles) {
            if (userRoles.contains(allowed)) {
                log.debug("isRoleAllowed: role {} matches allowed role {}", allowed, allowed);
                return true;
            }
        }
        log.debug("isRoleAllowed: NO MATCH found for userRoles={} in allowedRoles={}", userRoles, allowedRoles);
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

        String traceId = exchange.getRequest().getId();
        String errorCode = "D2F-" + httpStatus.value();
        String errorBody = String.format(
            "{\"timestamp\":\"%s\",\"status\":%d,\"errorCode\":\"%s\",\"error\":\"%s\",\"path\":\"%s\",\"traceId\":\"%s\"}",
            java.time.Instant.now().toString(),
            httpStatus.value(),
            errorCode,
            errorMessage,
            exchange.getRequest().getPath().value(),
            traceId
        );

        DataBufferFactory bufferFactory = response.bufferFactory();
        return response.writeWith(Mono.just(bufferFactory.wrap(errorBody.getBytes())));
    }

}
