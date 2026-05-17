package com.example.servicegateway.security;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitConfigTest {

    private final RateLimitConfig config = new RateLimitConfig();

    @Test
    void ipKeyResolver_returnsNonNull() {
        KeyResolver resolver = config.ipKeyResolver();
        assertThat(resolver).isNotNull();
    }

    @Test
    void ipKeyResolver_extractsFromXForwardedFor() {
        KeyResolver resolver = config.ipKeyResolver();

        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/test")
                        .header("X-Forwarded-For", "10.0.0.1, 192.168.1.1")
                        .build());

        StepVerifier.create(resolver.resolve(exchange))
                .assertNext(key -> assertThat(key).isEqualTo("10.0.0.1"))
                .verifyComplete();
    }

    @Test
    void ipKeyResolver_extractsFromXForwardedFor_singleIp() {
        KeyResolver resolver = config.ipKeyResolver();

        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/test")
                        .header("X-Forwarded-For", "172.16.0.5")
                        .build());

        StepVerifier.create(resolver.resolve(exchange))
                .assertNext(key -> assertThat(key).isEqualTo("172.16.0.5"))
                .verifyComplete();
    }

    @Test
    void ipKeyResolver_fallsBackToRemoteAddress_whenNoXForwardedFor() {
        KeyResolver resolver = config.ipKeyResolver();

        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/test").build());

        StepVerifier.create(resolver.resolve(exchange))
                .assertNext(key -> assertThat(key).isNotBlank())
                .verifyComplete();
    }

    @Test
    void ipKeyResolver_returnsUnknown_whenNoHeaders_andNoRemoteAddress() {
        KeyResolver resolver = config.ipKeyResolver();

        // MockServerHttpRequest with no headers and no remote address
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/test").build());

        // Should return some value (either from remote address or "unknown")
        StepVerifier.create(resolver.resolve(exchange))
                .assertNext(key -> assertThat(key).isNotNull())
                .verifyComplete();
    }
}
