package com.example.servicegateway.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Gateway Authorization Filter
 * Validates JWT tokens and checks role-based authorization at the gateway level
 * Prevents unauthorized requests from reaching backend services
 */
@Slf4j
@Component
public class AuthorizationFilter extends AbstractGatewayFilterFactory<AuthorizationFilter.Config> {

    private final JwtTokenProvider tokenProvider;

    public AuthorizationFilter(JwtTokenProvider tokenProvider) {
        super(Config.class);
        this.tokenProvider = tokenProvider;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            // Extract JWT token from Authorization header
            String token = extractToken(exchange);
            
            if (token == null) {
                log.warn("No JWT token found in request: {}", exchange.getRequest().getPath());
                return onError(exchange, "Missing authorization token", HttpStatus.UNAUTHORIZED);
            }

            if (!tokenProvider.isValidToken(token)) {
                log.warn("Invalid JWT token for request: {}", exchange.getRequest().getPath());
                return onError(exchange, "Invalid or expired token", HttpStatus.UNAUTHORIZED);
            }

            // Token is valid - check roles based on route
            String path = exchange.getRequest().getPath().value();
            String requiredRole = determineRequiredRole(path);
            String userRole = tokenProvider.getUserRole(token);

            if (requiredRole != null && !tokenProvider.hasRole(token, requiredRole)) {
                log.warn("User with role {} attempted unauthorized access to {}", userRole, path);
                return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
            }

            // Add user info to header for downstream services
            var mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", tokenProvider.getUserId(token))
                    .header("X-User-Role", userRole)
                    .header("X-User-Email", tokenProvider.getUserEmail(token))
                    .build();
            
            ServerWebExchange mutatedExchange = exchange.mutate().request(mutatedRequest).build();

            log.info("Authorization successful for user: {} with role: {}", 
                    tokenProvider.getUserId(token), userRole);
            
            return chain.filter(mutatedExchange);
        };
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
     * Determine required role based on request path
     * This implements the authorization matrix rules
     */
    private String determineRequiredRole(String path) {
        if (path.contains("/formations")) {
            if (path.endsWith("POST") || path.contains("update") || path.contains("delete")) {
                return "ROLE_ADMIN";
            }
            return "ROLE_USER";
        }
        
        if (path.contains("/competences")) {
            if (path.contains("delete")) {
                return "ROLE_ADMIN";
            }
            return "ROLE_USER";
        }

        if (path.contains("/besoinsFormations")) {
            if (path.contains("delete") || path.contains("modify")) {
                return "ROLE_ADMIN";
            }
            return "ROLE_USER";
        }

        if (path.contains("/user/account")) {
            if (path.contains("list") || path.contains("ban") || path.contains("enable")) {
                return "ROLE_ADMIN";
            }
            return "ROLE_USER";
        }

        return null; // No specific role required
    }

    /**
     * Handle authorization errors
     */
    private Mono<Void> onError(ServerWebExchange exchange, String errorMessage, HttpStatus httpStatus) {
        var response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        response.getHeaders().add("Content-Type", "application/json");
        
        String errorBody = String.format(
            "{\"error\": \"%s\", \"status\": %d}",
            errorMessage,
            httpStatus.value()
        );
        
        DataBufferFactory bufferFactory = response.bufferFactory();
        return response.writeWith(Mono.just(bufferFactory.wrap(errorBody.getBytes())));
    }

    public static class Config {
    }
}
