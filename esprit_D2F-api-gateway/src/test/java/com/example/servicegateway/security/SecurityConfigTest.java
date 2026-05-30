package com.example.servicegateway.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * Vérifie le verrou « deny-by-default » de {@link SecurityConfig} (blocker DSI #3) :
 * toute route protégée exige un JWT valide, les routes publiques restent accessibles.
 */
@SpringBootTest(webEnvironment = RANDOM_PORT)
class SecurityConfigTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void protectedRoute_withoutToken_isUnauthorized() {
        webTestClient.get().uri("/api/formation/something")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void protectedRoute_withInvalidToken_isUnauthorized() {
        webTestClient.get().uri("/api/competence/list")
                .header("Authorization", "Bearer not-a-real-jwt")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void optionsPreflight_isNotBlockedBySecurity() {
        // Le préflight CORS ne doit jamais être rejeté en 401 (sinon le navigateur échoue).
        webTestClient.options().uri("/api/formation/something")
                .exchange()
                .expectStatus().value(status -> {
                    assert status != HttpStatus.UNAUTHORIZED.value()
                            : "OPTIONS preflight must not return 401";
                });
    }

    @Test
    void publicLoginRoute_isNotUnauthorized() {
        // /api/auth/login est public : la sécurité ne doit pas renvoyer 401
        // (le statut réel dépend du routage downstream, mais jamais 401 au niveau gateway).
        webTestClient.post().uri("/api/auth/login")
                .exchange()
                .expectStatus().value(status -> {
                    assert status != HttpStatus.UNAUTHORIZED.value()
                            : "Public login route must not return 401";
                });
    }
}
