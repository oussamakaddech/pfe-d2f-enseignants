package com.example.servicegateway.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

/**
 * Contrôleur de fallback pour le circuit breaker du Gateway.
 * Retourne une réponse 503 Service Unavailable au format d'erreur
 * standard DSI (conformité §2.1).
 *
 * Invoqué automatiquement par le filtre CircuitBreaker quand :
 * - Le circuit est OPEN (seuil d'échecs dépassé)
 * - Le service aval est en timeout
 * - Le service aval retourne une erreur 5xx
 */
@Slf4j
@RestController
public class CircuitBreakerFallbackController {

    @Value("${gateway.fallback.uri:/fallback}")
    private String fallbackUri;

    @Value("${gateway.fallback.unknown-path:/unknown}")
    private String unknownPathPlaceholder = "/unknown";

    @RequestMapping("${gateway.fallback.uri:/fallback}")
    public Mono<String> fallback(ServerWebExchange exchange) {
        // Récupérer le path original demandé par le client
        String originalPath = unknownPathPlaceholder;
        var originalUris = exchange.getAttribute(
                org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ORIGINAL_REQUEST_URL_ATTR);
        if (originalUris instanceof java.util.LinkedHashSet<?> uris && !uris.isEmpty()) {
            originalPath = ((java.net.URI) uris.iterator().next()).getPath();
        }

        String serviceName = inferServiceName(originalPath);
        String traceId = UUID.randomUUID().toString();

        log.warn("Circuit breaker fallback triggered for service={} path={} traceId={}",
                serviceName, originalPath, traceId);

        exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = String.format(
                "{\"timestamp\":\"%s\",\"status\":503,\"error\":\"Service Unavailable\","
                        + "\"errorCode\":\"GATEWAY-CB-503\","
                        + "\"message\":\"Le service '%s' est temporairement indisponible. Veuillez réessayer dans quelques instants.\","
                        + "\"path\":\"%s\",\"traceId\":\"%s\"}",
                Instant.now().toString(),
                serviceName,
                originalPath,
                traceId
        );

        return Mono.just(body);
    }

    /**
     * Déduit le nom du service à partir du path original pour un message d'erreur lisible.
     */
    private String inferServiceName(String path) {
        if (path == null) return "inconnu";
        if (path.contains("auth") || path.contains("account")) return "authentification";
        if (path.contains("besoins-formation")) return "besoin-formation";
        if (path.contains("formation")) return "formation";
        if (path.contains("competence")) return "compétence";
        if (path.contains("evaluation")) return "évaluation";
        if (path.contains("certificat")) return "certificat";
        if (path.contains("analyse")) return "analyse-prédictive";
        if (path.contains("rice")) return "RICE";
        if (path.contains("skill-passports")) return "skill-passport";
        return "inconnu";
    }
}
