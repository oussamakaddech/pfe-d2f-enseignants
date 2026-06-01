package com.example.servicegateway.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthorizationFilterTest {

    private AuthorizationFilter authorizationFilter;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private GatewayFilterChain chain;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        authorizationFilter = new AuthorizationFilter(tokenProvider);
        when(chain.filter(any(ServerWebExchange.class))).thenReturn(Mono.empty());
    }

    @Test
    void apply_PublicEndpoint_ShouldAllowAccess() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/auth/login").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        verify(chain).filter(exchange);
        verifyNoInteractions(tokenProvider);
    }

    @Test
    void apply_OptionsRequest_ShouldAllowAccess() {
        MockServerHttpRequest request = MockServerHttpRequest.method(HttpMethod.OPTIONS, "/api/any").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        verify(chain).filter(exchange);
    }

    @Test
    void apply_MissingToken_ShouldReturnUnauthorized() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/formation/list").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test
    void apply_InvalidToken_ShouldReturnUnauthorized() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/formation/list")
                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        when(tokenProvider.isValidToken("invalid-token")).thenReturn(false);

        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @ParameterizedTest
    @CsvSource({
        "/api/auth/login",
        "/api/auth/signup",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/confirm",
        "/actuator/health"
    })
    void apply_PublicEndpoints_ShouldAllowAccess(String path) {
        MockServerHttpRequest request = MockServerHttpRequest.get(path).build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        verify(chain).filter(exchange);
        verifyNoInteractions(tokenProvider);
    }

    @ParameterizedTest
    @CsvSource({
        "/api/auth/profile, GET, ENSEIGNANT, true",
        "/api/auth/edit-profile, POST, CUP, true",
        "/api/auth/update-password, PUT, FORMATEUR, true",
        "/api/auth/list-accounts, GET, ADMIN, true",
        "/api/auth/ban-account, POST, ADMIN, true",
        "/api/auth/enable-account, POST, ADMIN, true",
        "/api/auth/delete/1, DELETE, ADMIN, true",
        "/api/auth/update/1, PUT, ADMIN, true",
        "/api/account/profile, GET, ENSEIGNANT, true",
        "/api/account/edit-profile, POST, ENSEIGNANT, true",
        "/api/account/update-password, PUT, ENSEIGNANT, true",
        "/api/account/list-accounts, GET, ADMIN, true",
        "/api/account/ban-account, POST, ADMIN, true",
        "/api/account/enable-account, POST, ADMIN, true",
        "/api/account/delete/1, DELETE, ADMIN, true",
        "/api/account/update/1, PUT, ADMIN, true",
        "/api/formation/kpi, GET, ADMIN, true",
        "/api/formation/kpi, GET, FORMATEUR, false",
        "/api/formation/any, DELETE, ADMIN, true",
        "/api/formation/any, DELETE, CUP, false",
        "/api/formation/inscription/inscriptions, POST, ENSEIGNANT, true",
        "/api/formation/any, POST, CUP, true",
        "/api/formation/any, PUT, CUP, true",
        "/api/formation/any, PATCH, CUP, true",
        "/api/besoinsformation/approve/1, PUT, D2F, true",
        "/api/besoinsformation/approve/1, PUT, ENSEIGNANT, false",
        "/api/besoins-formation/any, GET, ENSEIGNANT, true",
        "/api/besoins-formation/any, POST, ENSEIGNANT, true",
        "/api/besoinsformation/any, DELETE, ADMIN, true",
        "/api/besoinsformation/modify, PUT, ADMIN, true",
        "/api/besoinsformation/modify, PUT, CUP, false",
        "/api/competence/rice, GET, ADMIN, true",
        "/api/competence/any, DELETE, ADMIN, true",
        "/api/competence/any, POST, ADMIN, true",
        "/api/competence/any, POST, CUP, false",
        "/api/competence/any, GET, CUP, true",
        "/api/competence/any, GET, FORMATEUR, false",
        "/api/evaluation/any, DELETE, ADMIN, true",
        "/api/evaluation/any, POST, FORMATEUR, true",
        "/api/evaluation/any, PUT, FORMATEUR, true",
        "/api/evaluation/any, PATCH, FORMATEUR, true",
        "/api/certificat/any, DELETE, ADMIN, true",
        "/api/certificat/any, POST, ENSEIGNANT, false",
        "/api/certificat/any, GET, ENSEIGNANT, true",
        "/api/certificat/any, PUT, ADMIN, true",
        "/api/certificat/any, PATCH, ADMIN, true",
        "/api/rice/any, GET, ADMIN, true",
        "/api/rice/any, GET, ENSEIGNANT, false",
        "/api/analyse/predict/train, POST, ADMIN, true",
        "/api/analyse/predict/train, POST, CUP, false",
        "/api/analyse/dashboard/any, GET, CHEF_DEPARTEMENT, true",
        "/api/analyse/dashboard/overview, GET, D2F, true",
        "/api/analyse/detect/any, GET, CUP, true",
        "/api/analyse/detect/gaps, GET, D2F, true",
        "/api/analyse/summary, GET, CHEF_DEPARTEMENT, true",
        "/api/analyse/summary, GET, FORMATEUR, false",
        "/api/analyse/any, GET, ENSEIGNANT, true",
        "/api/any/other, GET, ENSEIGNANT, true",
        "/api/formation/list, GET, , false",
        "/api/formation/list, GET, '   ', false",
        "/api/formation/list, GET, ENSEIGNANT, true",
        "/api/competence/any, GET, UNKNOWN_ROLE, false"
    })
    void testAuthorizationMatrix(String path, String method, String role, boolean expectedAllowed) {
        MockServerHttpRequest request = MockServerHttpRequest.method(HttpMethod.valueOf(method), path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer token")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        
        when(tokenProvider.isValidToken("token")).thenReturn(true);
        when(tokenProvider.getUserRole("token")).thenReturn(role);
        when(tokenProvider.getUserId("token")).thenReturn("user");

        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        if (expectedAllowed) {
            verify(chain, atLeastOnce()).filter(any(ServerWebExchange.class));
            assertNotEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        } else {
            assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        }
    }

    @Test
    void apply_ValidTokenWithHeaders_ShouldForwardWithHeaders() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/formation/list")
                .header(HttpHeaders.AUTHORIZATION, "Bearer token")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        when(tokenProvider.isValidToken("token")).thenReturn(true);
        when(tokenProvider.getUserRole("token")).thenReturn("ENSEIGNANT");
        when(tokenProvider.getUserId("token")).thenReturn("user-123");
        when(tokenProvider.getUserEmail("token")).thenReturn("user@test.com");

        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        verify(chain).filter(argThat(ex ->
            "user-123".equals(ex.getRequest().getHeaders().getFirst("X-User-Id")) &&
            "ENSEIGNANT".equals(ex.getRequest().getHeaders().getFirst("X-User-Role")) &&
            "user@test.com".equals(ex.getRequest().getHeaders().getFirst("X-User-Email")) &&
            "Bearer token".equals(ex.getRequest().getHeaders().getFirst("Authorization"))
        ));
    }
}
