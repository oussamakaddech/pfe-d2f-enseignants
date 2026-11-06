package com.example.servicegateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;

/**
 * JWT Token Provider
 * Validates JWT tokens and extracts user information
 */
@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:7200000}")
    private long jwtExpirationMs;

    private static final int MIN_JWT_SECRET_LENGTH = 64;

    @PostConstruct
    void validateJwtSecret() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                "JWT_SECRET est obligatoire et doit etre injecte via variable d'environnement.");
        }
        if (jwtSecret.length() < MIN_JWT_SECRET_LENGTH) {
            throw new IllegalStateException(
                "JWT_SECRET trop court (" + jwtSecret.length() + " chars). Minimum requis : "
                    + MIN_JWT_SECRET_LENGTH + " caracteres pour HS512.");
        }
        if (jwtSecret.contains("CHANGE_ME") || jwtSecret.contains("change-me")) {
            throw new IllegalStateException(
                "JWT_SECRET contient un placeholder (CHANGE_ME). Configurer une valeur reelle en environnement.");
        }
    }

    /**
     * Validate JWT token
     */
    public boolean isValidToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            // Check if token is expired
            return claims.getExpiration().toInstant().isAfter(Instant.now());
        } catch (JwtException e) {
            log.error("Invalid JWT token", e);
        } catch (Exception e) {
            log.error("JWT validation failed", e);
        }
        return false;
    }

    /**
     * Get user ID from token
     */
    public String getUserId(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getSubject();
        } catch (Exception e) {
            log.error("Failed to extract user ID from token", e);
            return null;
        }
    }

    /**
     * Get user role from token
     */
    public String getUserRole(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return (String) claims.get("scope");
        } catch (Exception e) {
            log.error("Failed to extract role from token", e);
            return null;
        }
    }

    /**
     * Get user email from token
     */
    public String getUserEmail(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return (String) claims.get("email");
        } catch (Exception e) {
            log.error("Failed to extract email from token", e);
            return null;
        }
    }

    /**
     * Check if token contains required role
     */
    public boolean hasRole(String token, String requiredRole) {
        String userRole = getUserRole(token);
        if (userRole == null) {
            return false;
        }
        
        // Check if user role contains the required role
        return userRole.contains(requiredRole);
    }
}
