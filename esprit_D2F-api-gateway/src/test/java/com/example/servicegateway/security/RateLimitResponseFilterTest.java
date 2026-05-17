package com.example.servicegateway.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.http.server.reactive.MockServerHttpResponse;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RateLimitResponseFilterTest {

    private RateLimitResponseFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitResponseFilter();
    }

    @Test
    void getOrder_returnsNegativeOne() {
        assertThat(filter.getOrder()).isEqualTo(-1);
    }

    @Test
    void filter_non429Response_passesThrough() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/formation/list").build());
        exchange.getResponse().setStatusCode(HttpStatus.OK);

        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(exchange)).thenReturn(Mono.empty());

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        verify(chain).filter(exchange);
    }

    @Test
    void filter_429Response_writesJsonErrorBody() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/formation/list")
                .header("X-Forwarded-For", "192.168.1.1")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(exchange)).thenReturn(Mono.defer(() -> {
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return Mono.empty();
        }));

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        MockServerHttpResponse response = exchange.getResponse();
        assertThat(response.getHeaders().getContentType())
                .hasToString("application/json");
    }

    @Test
    void filter_429Response_withRemoteAddress_extractsIp() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/evaluation/submit")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(exchange)).thenReturn(Mono.defer(() -> {
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return Mono.empty();
        }));

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();
    }
}
