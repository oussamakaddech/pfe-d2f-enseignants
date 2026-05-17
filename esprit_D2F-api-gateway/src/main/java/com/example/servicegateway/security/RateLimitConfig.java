package com.example.servicegateway.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

/**
 * Configuration des KeyResolvers pour le rate limiting.
 * Chaque resolver identifie le client par son adresse IP distante.
 */
@Configuration
@Slf4j
public class RateLimitConfig {

    /**
     * KeyResolver par défaut — résout par IP du client.
     * Utilisé par toutes les routes avec RequestRateLimiter.
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            String ip = extractClientIp(exchange);
            log.debug("Rate limit key resolved: {}", ip);
            return Mono.just(ip);
        };
    }

    /**
     * Extrait l'IP réelle du client, en tenant compte des proxies
     * (header X-Forwarded-For) pour les déploiements derrière un load balancer.
     */
    private String extractClientIp(org.springframework.web.server.ServerWebExchange exchange) {
        String xForwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            // Prendre la première IP (client original) de la chaîne
            return xForwardedFor.split(",")[0].trim();
        }
        var remoteAddress = exchange.getRequest().getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }
}
