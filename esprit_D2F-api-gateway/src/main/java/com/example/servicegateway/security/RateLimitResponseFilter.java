package com.example.servicegateway.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

/**
 * Filtre global qui intercepte les réponses 429 Too Many Requests
 * générées par le RequestRateLimiter et les reformate au format
 * d'erreur standard DSI (conformité §2.1).
 */
@Component
@Slf4j
public class RateLimitResponseFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return chain.filter(exchange).then(Mono.defer(() -> {
            if (exchange.getResponse().getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                String path = exchange.getRequest().getPath().value();
                String clientIp = extractClientIp(exchange);
                log.warn("Rate limit exceeded for IP={} on path={}", clientIp, path);

                var response = exchange.getResponse();
                response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

                String errorBody = String.format(
                    "{\"timestamp\":\"%s\",\"status\":429,\"error\":\"Too Many Requests\","
                    + "\"errorCode\":\"GATEWAY-429\","
                    + "\"message\":\"Rate limit exceeded. Please try again later.\","
                    + "\"path\":\"%s\",\"traceId\":\"%s\"}",
                    Instant.now().toString(),
                    path,
                    UUID.randomUUID().toString()
                );

                DataBufferFactory bufferFactory = response.bufferFactory();
                return response.writeWith(Mono.just(bufferFactory.wrap(errorBody.getBytes())));
            }
            return Mono.empty();
        }));
    }

    @Override
    public int getOrder() {
        // Execute after the rate limiter filter but before downstream response
        return -1;
    }

    private String extractClientIp(ServerWebExchange exchange) {
        String xForwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        var remoteAddress = exchange.getRequest().getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }
}
