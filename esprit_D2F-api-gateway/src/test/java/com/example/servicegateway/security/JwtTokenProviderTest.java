package com.example.servicegateway.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private final String secret = "testSecretKeyWithEnoughLengthToSatisfyHmacShaKeyForRequirementOK";
    private String validToken;
    private String expiredToken;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 3600000);

        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes());
        
        validToken = Jwts.builder()
                .subject("test-user")
                .claim("scope", "ROLE_USER")
                .claim("email", "test@example.com")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(key)
                .compact();

        expiredToken = Jwts.builder()
                .subject("test-user")
                .issuedAt(new Date(System.currentTimeMillis() - 7200000))
                .expiration(new Date(System.currentTimeMillis() - 3600000))
                .signWith(key)
                .compact();
    }

    @Test
    void isValidToken_ShouldReturnTrueForValidToken() {
        assertTrue(jwtTokenProvider.isValidToken(validToken));
    }

    @Test
    void isValidToken_ShouldReturnFalseForExpiredToken() {
        assertFalse(jwtTokenProvider.isValidToken(expiredToken));
    }

    @Test
    void isValidToken_ShouldReturnFalseForInvalidToken() {
        assertFalse(jwtTokenProvider.isValidToken("invalid-token"));
    }

    @Test
    void getUserId_ShouldReturnCorrectId() {
        assertEquals("test-user", jwtTokenProvider.getUserId(validToken));
    }

    @Test
    void getUserRole_ShouldReturnCorrectRole() {
        assertEquals("ROLE_USER", jwtTokenProvider.getUserRole(validToken));
    }

    @Test
    void getUserEmail_ShouldReturnCorrectEmail() {
        assertEquals("test@example.com", jwtTokenProvider.getUserEmail(validToken));
    }

    @Test
    void hasRole_ShouldReturnTrueIfRoleExists() {
        assertTrue(jwtTokenProvider.hasRole(validToken, "ROLE_USER"));
    }

    @Test
    void hasRole_ShouldReturnFalseIfRoleDoesNotExist() {
        assertFalse(jwtTokenProvider.hasRole(validToken, "ROLE_ADMIN"));
    }

    @Test
    void getUserId_ShouldReturnNullForInvalidToken() {
        assertNull(jwtTokenProvider.getUserId("invalid-token"));
    }

    @Test
    void getUserRole_ShouldReturnNullForInvalidToken() {
        assertNull(jwtTokenProvider.getUserRole("invalid-token"));
    }

    @Test
    void getUserEmail_ShouldReturnNullForInvalidToken() {
        assertNull(jwtTokenProvider.getUserEmail("invalid-token"));
    }

    @Test
    void hasRole_ShouldReturnFalseWhenUserRoleIsNull() {
        assertFalse(jwtTokenProvider.hasRole("invalid-token", "ROLE_USER"));
    }

    @Test
    void isValidToken_ShouldReturnFalseForMalformedToken() {
        assertFalse(jwtTokenProvider.isValidToken("this.is.not-a-valid-jwt"));
    }

    @Test
    void validateJwtSecret_ShouldPassWithStrongSecret() {
        assertDoesNotThrow(jwtTokenProvider::validateJwtSecret);
    }

    @ParameterizedTest
    @CsvSource({
        "null, JWT_SECRET est obligatoire",
        "trop-court, trop court",
        "CHANGE_ME_please_replace_this_long_placeholder_secret_value_CHANGE_ME_123, placeholder"
    })
    void validateJwtSecret_ShouldRejectInvalidSecrets(String candidate, String expectedFragment) {
        // "null" marque un secret null (indiquant une variable d'environnement absente).
        String secretValue = "null".equals(candidate) ? null : candidate;
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secretValue);
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                jwtTokenProvider::validateJwtSecret);
        assertTrue(ex.getMessage().contains(expectedFragment));
    }
}
