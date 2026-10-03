package com.example.servicegateway.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.test.StepVerifier;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Construction de l'{@code Authentication} à partir du JWT : autorités issues du
 * claim {@code scope}, sans re-préfixage {@code ROLE_ROLE_*}, et rejet explicite
 * d'un jeton absent ou invalide.
 */
class SecurityConfigAuthoritiesTest {

    private JwtTokenProvider tokenProvider;
    private SecurityConfig config;

    @BeforeEach
    void setUp() {
        tokenProvider = mock(JwtTokenProvider.class);
        config = new SecurityConfig(tokenProvider);
    }

    private ReactiveAuthenticationManager manager() {
        ReactiveAuthenticationManager manager =
                (ReactiveAuthenticationManager) ReflectionTestUtils.invokeMethod(config, "jwtAuthenticationManager");
        assertNotNull(manager);
        return manager;
    }

    private static Authentication credentials(String token) {
        return new UsernamePasswordAuthenticationToken(null, token);
    }

    @Test
    @DisplayName("Jeton valide : l'identité est l'userId et les rôles viennent du claim scope")
    void jetonValide() {
        when(tokenProvider.isValidToken("jwt")).thenReturn(true);
        when(tokenProvider.getUserRole("jwt")).thenReturn("ROLE_ADMIN ROLE_CUP");
        when(tokenProvider.getUserId("jwt")).thenReturn("user-42");

        StepVerifier.create(manager().authenticate(credentials("jwt")))
                .assertNext(auth -> {
                    assertEquals("user-42", auth.getPrincipal());
                    List<String> roles = auth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority).toList();
                    assertEquals(List.of("ROLE_ADMIN", "ROLE_CUP"), roles);
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("Rôle sans préfixe : ROLE_ est ajouté une seule fois (jamais ROLE_ROLE_*)")
    void prefixeAjouteUneSeuleFois() {
        when(tokenProvider.isValidToken("jwt")).thenReturn(true);
        when(tokenProvider.getUserRole("jwt")).thenReturn("ADMIN   ROLE_ENSEIGNANT");
        when(tokenProvider.getUserId("jwt")).thenReturn("user-7");

        StepVerifier.create(manager().authenticate(credentials("jwt")))
                .assertNext(auth -> {
                    List<String> roles = auth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority).toList();
                    assertEquals(List.of("ROLE_ADMIN", "ROLE_ENSEIGNANT"), roles);
                    assertTrue(roles.stream().noneMatch(r -> r.startsWith("ROLE_ROLE_")));
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("Claim scope absent ou vide : authentification sans aucune autorité")
    void scopeAbsentOuVide() {
        when(tokenProvider.isValidToken(anyString())).thenReturn(true);
        when(tokenProvider.getUserId(anyString())).thenReturn("user-1");
        when(tokenProvider.getUserRole("sans-scope")).thenReturn(null);
        when(tokenProvider.getUserRole("scope-vide")).thenReturn("   ");

        StepVerifier.create(manager().authenticate(credentials("sans-scope")))
                .assertNext(auth -> assertTrue(auth.getAuthorities().isEmpty()))
                .verifyComplete();
        StepVerifier.create(manager().authenticate(credentials("scope-vide")))
                .assertNext(auth -> assertTrue(auth.getAuthorities().isEmpty()))
                .verifyComplete();
    }

    @Test
    @DisplayName("Jeton absent ou invalide : BadCredentialsException (401, jamais 500)")
    void jetonAbsentOuInvalide() {
        when(tokenProvider.isValidToken("expire")).thenReturn(false);

        StepVerifier.create(manager().authenticate(credentials(null)))
                .expectError(BadCredentialsException.class)
                .verify();
        StepVerifier.create(manager().authenticate(credentials("expire")))
                .expectError(BadCredentialsException.class)
                .verify();
    }
}
