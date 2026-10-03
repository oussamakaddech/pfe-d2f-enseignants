package com.example.servicegateway.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.test.StepVerifier;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CircuitBreakerFallbackControllerTest {

    private CircuitBreakerFallbackController controller;

    @BeforeEach
    void setUp() {
        controller = new CircuitBreakerFallbackController();
    }

    // ── fallback method ──────────────────────────────────────────

    @Test
    void fallback_returns503WithJsonBody() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/fallback").build());

        StepVerifier.create(controller.fallback(exchange))
                .assertNext(body -> {
                    assertThat(body).contains("503");
                    assertThat(body).contains("Service Unavailable");
                    assertThat(body).contains("GATEWAY-CB-503");
                    assertThat(body).contains("traceId");
                })
                .verifyComplete();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void fallback_extractsOriginalPath_whenAttributePresent() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/fallback").build());

        Set<URI> originalUris = new LinkedHashSet<>();
        originalUris.add(URI.create("http://localhost:8088/api/formation/list"));
        exchange.getAttributes().put(
                ServerWebExchangeUtils.GATEWAY_ORIGINAL_REQUEST_URL_ATTR, originalUris);

        StepVerifier.create(controller.fallback(exchange))
                .assertNext(body -> {
                    assertThat(body).contains("formation");
                    assertThat(body).contains("/api/formation/list");
                })
                .verifyComplete();
    }

    @Test
    void fallback_usesUnknownPath_whenNoOriginalAttribute() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/fallback").build());

        StepVerifier.create(controller.fallback(exchange))
                .assertNext(body -> assertThat(body).contains("/unknown"))
                .verifyComplete();
    }

    // ── inferServiceName coverage ────────────────────────────────

    @ParameterizedTest
    @CsvSource({
            "/api/auth/login,            authentification",
            "/api/account/profile/x,     authentification",
            "/api/formation/list,        formation",
            "/api/competence/domain,     compétence",
            "/api/evaluation/submit,     évaluation",
            "/api/certificat/export,     certificat",
            "/api/besoins-formation/all, besoin-formation",
            "/api/analyse/predict,       analyse-prédictive",
            "/api/rice/score,            RICE",
            "/api/v1/skill-passports/me, skill-passport",
            "/api/something-else,        inconnu"
    })
    void fallback_infersCorrectServiceName(String path, String expectedService) {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/fallback").build());

        Set<URI> originalUris = new LinkedHashSet<>();
        originalUris.add(URI.create("http://localhost" + path));
        exchange.getAttributes().put(
                ServerWebExchangeUtils.GATEWAY_ORIGINAL_REQUEST_URL_ATTR, originalUris);

        StepVerifier.create(controller.fallback(exchange))
                .assertNext(body -> assertThat(body).contains(expectedService))
                .verifyComplete();
    }

    @Test
    void describeCause_nommeLaCauseEtSaRacine() {
        Throwable cause = new IllegalStateException("appel refusé",
                new java.net.ConnectException("Connection refused: d2f-predictive-analytics/172.18.0.14:8000"));
        assertThat(CircuitBreakerFallbackController.describeCause(cause))
                .isEqualTo("IllegalStateException: appel refusé <- ConnectException: "
                        + "Connection refused: d2f-predictive-analytics/172.18.0.14:8000");
    }

    @Test
    void describeCause_sansCause() {
        assertThat(CircuitBreakerFallbackController.describeCause(null)).isEqualTo("inconnue");
        assertThat(CircuitBreakerFallbackController.describeCause(new RuntimeException("x")))
                .isEqualTo("RuntimeException: x");
    }

    @Test
    void fallback_neRenvoiePasLaCauseAuClient() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/fallback").build());
        exchange.getAttributes().put(ServerWebExchangeUtils.CIRCUITBREAKER_EXECUTION_EXCEPTION_ATTR,
                new java.net.ConnectException("Connection refused: interne/10.0.0.1:8000"));
        StepVerifier.create(controller.fallback(exchange))
                .assertNext(body -> assertThat(body).doesNotContain("10.0.0.1").contains("GATEWAY-CB-503"))
                .verifyComplete();
    }
}
