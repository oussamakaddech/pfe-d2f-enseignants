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
        "/api/account/list-accounts, GET, ANIMATEUR, true",
        "/api/account/list-accounts, GET, ENSEIGNANT, false",
        "/api/account/ban-account, POST, ADMIN, true",
        "/api/account/enable-account, POST, ADMIN, true",
        "/api/account/delete/1, DELETE, ADMIN, true",
        "/api/account/permanent-delete/1, DELETE, ADMIN, true",
        "/api/account/permanent-delete/1, DELETE, ENSEIGNANT, false",
        "/api/account/update/1, PUT, ADMIN, true",
        "/api/formation/kpi, GET, ADMIN, true",
        "/api/formation/kpi, GET, ANIMATEUR, true",
        // Parité DASHBOARD_ADMIN_LIMITED : le dashboard /home affiche les KPIs au
        // RESPONSABLE_DOSSIER (l'analyse prédictive reste pilotage).
        "/api/formation/kpi, GET, RESPONSABLE_DOSSIER, true",
        "/api/formation/kpi, GET, FORMATEUR, false",
        "/api/formation/any, DELETE, ADMIN, true",
        "/api/formation/any, DELETE, CUP, false",
        "/api/formation/inscription/inscriptions, POST, ENSEIGNANT, true",
        "/api/formation/any, POST, CUP, true",
        "/api/formation/any, POST, D2F, true",
        "/api/formation/any, POST, CHEF_DEPARTEMENT, false",
        "/api/formation/any, POST, RESPONSABLE_DOSSIER, false",
        "/api/formation/any, PUT, CUP, true",
        "/api/formation/any, PATCH, CUP, true",
        "/api/formation/mail/send, POST, ADMIN, true",
        "/api/formation/mail/send, POST, CUP, true",
        "/api/formation/mail/send, POST, D2F, true",
        "/api/formation/mail/send, POST, CHEF_DEPARTEMENT, false",
        "/api/formation/mail/send, POST, RESPONSABLE_DOSSIER, false",
        "/api/formation/mail/send, POST, ENSEIGNANT, false",
        "/api/formation/mail/send, POST, ANIMATEUR, false",
        // Documents de formation : parité DOCUMENT_* (ADMIN/CUP/RESPONSABLE_DOSSIER).
        "/api/formation/documents, POST, RESPONSABLE_DOSSIER, true",
        "/api/formation/documents, POST, CUP, true",
        "/api/formation/documents, POST, ADMIN, true",
        "/api/formation/documents, POST, ENSEIGNANT, false",
        "/api/formation/documents, PUT, RESPONSABLE_DOSSIER, true",
        "/api/formation/documents, PATCH, RESPONSABLE_DOSSIER, true",
        "/api/formation/documents, DELETE, RESPONSABLE_DOSSIER, true",
        "/api/formation/documents, DELETE, CUP, true",
        "/api/formation/documents, DELETE, ENSEIGNANT, false",
        "/api/formation/documents, GET, RESPONSABLE_DOSSIER, true",
        "/api/formation/documents, GET, ENSEIGNANT, true",
        "/api/besoinsformation/approve/1, PUT, D2F, true",
        "/api/besoinsformation/approve/1, PUT, ENSEIGNANT, false",
        "/api/besoins-formation/any, GET, ENSEIGNANT, true",
        "/api/besoins-formation/any, GET, ANIMATEUR, true",
        // Parité BESOIN_FORMATION_READ_ALL : RESPONSABLE_DOSSIER consulte les besoins.
        "/api/besoins-formation/any, GET, RESPONSABLE_DOSSIER, true",
        "/api/besoins-formation/any, POST, ENSEIGNANT, true",
        "/api/besoins-formation/any, POST, ANIMATEUR, true",
        "/api/besoins-formation/any, POST, D2F, true",
        "/api/besoins-formation/any, POST, CHEF_DEPARTEMENT, false",
        // Workflow besoins : approve / reject / cancel / reviewer-scopes.
        "/api/besoins-formation/5/approve, PUT, CUP, true",
        "/api/besoins-formation/5/approve, PUT, ENSEIGNANT, false",
        "/api/besoins-formation/5/reject, PUT, ADMIN, true",
        "/api/besoins-formation/5/cancel, PUT, ENSEIGNANT, true",
        "/api/besoins-formation/reviewer-scopes, GET, ADMIN, true",
        "/api/besoins-formation/reviewer-scopes, GET, CUP, false",
        "/api/besoins-formation/reviewer-scopes/me, GET, CUP, true",
        "/api/besoins-formation/any/modify, PUT, ANIMATEUR, true",
        "/api/besoins-formation/any/modify, GET, CUP, true",
        "/api/besoinsformation/any, DELETE, ADMIN, true",
        "/api/besoinsformation/any, DELETE, ENSEIGNANT, true",
        "/api/besoinsformation/any, DELETE, ANIMATEUR, true",
        "/api/besoinsformation/any, DELETE, CUP, false",
        "/api/besoinsformation/modify, PUT, ADMIN, true",
        "/api/besoinsformation/modify, PUT, ENSEIGNANT, true",
        "/api/besoinsformation/modify, PUT, ANIMATEUR, true",
        "/api/besoinsformation/modify, PUT, CUP, false",
        "/api/competence/rice, GET, ADMIN, true",
        "/api/competence/any, DELETE, ADMIN, true",
        "/api/competence/any, POST, ADMIN, true",
        "/api/competence/any, POST, CUP, false",
        "/api/competence/any, GET, CUP, true",
        "/api/competence/any, GET, ANIMATEUR, true",
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
        "/api/rice/any, GET, CUP, true",
        "/api/rice/any, GET, CHEF_DEPARTEMENT, true",
        "/api/rice/any, GET, ENSEIGNANT, false",
        "/api/rice/any, POST, ADMIN, true",
        "/api/rice/any, POST, CUP, false",
        "/api/rice/any, DELETE, ADMIN, true",
        "/api/rice/any, DELETE, CUP, false",
        "/api/analyse/predict/train, POST, ADMIN, true",
        "/api/analyse/predict/train, POST, CUP, false",
        "/api/analyse/dashboard/any, GET, CHEF_DEPARTEMENT, true",
        "/api/analyse/dashboard/overview, GET, D2F, true",
        "/api/analyse/detect/any, GET, CUP, true",
        "/api/analyse/detect/gaps, GET, D2F, true",
        "/api/analyse/summary, GET, CHEF_DEPARTEMENT, true",
        "/api/analyse/summary, GET, FORMATEUR, false",
        "/api/analyse/any, GET, ENSEIGNANT, true",
        "/api/analyse/any, GET, ANIMATEUR, true",
        "/api/analyse/any, GET, FORMATEUR, false",
        "/api/v1/analyse-predictive/overview, GET, ADMIN, true",
        "/api/v1/analyse-predictive/overview, GET, CUP, true",
        "/api/v1/analyse-predictive/overview, GET, ENSEIGNANT, false",
        "/api/any/other, GET, ENSEIGNANT, true",
        "/api/formation/list, GET, , false",
        "/api/formation/list, GET, '   ', false",
        "/api/formation/list, GET, ENSEIGNANT, true",
        "/api/competence/any, GET, UNKNOWN_ROLE, false",
        // BFF analyse predictive (2e membre du ||) + presences PUT/PATCH.
        "/api/v2/analytics/stats, GET, CUP, true",
        "/api/v2/analytics/stats, GET, ENSEIGNANT, false",
        "/api/formation/seances/1/presences, PUT, ANIMATEUR, true",
        "/api/formation/seances/1/presences, PATCH, FORMATEUR, true",
        "/api/formation/seances/1/presences, PUT, D2F, false",
        "/api/formation/seances/1/presence/2, PUT, ENSEIGNANT, true"
    })
    void testAuthorizationMatrix(String path, String method, String role, boolean expectedAllowed) {
        MockServerHttpRequest request = MockServerHttpRequest.method(HttpMethod.valueOf(method), path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer token")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        
        when(tokenProvider.isValidToken("token")).thenReturn(true);
        // The JWT "scope" claim emits ROLE_-prefixed authorities; mirror that here.
        String effectiveRole = (role == null || role.strip().isEmpty() || role.startsWith("ROLE_")) ? role : "ROLE_" + role;
        when(tokenProvider.getUserRole("token")).thenReturn(effectiveRole);
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
        when(tokenProvider.getUserRole("token")).thenReturn("ROLE_ENSEIGNANT");
        when(tokenProvider.getUserId("token")).thenReturn("user-123");
        when(tokenProvider.getUserEmail("token")).thenReturn("user@test.com");

        GatewayFilter filter = authorizationFilter.apply(new AuthorizationFilter.Config() {});

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        verify(chain).filter(argThat(ex ->
            "user-123".equals(ex.getRequest().getHeaders().getFirst("X-User-Id")) &&
            "ROLE_ENSEIGNANT".equals(ex.getRequest().getHeaders().getFirst("X-User-Role")) &&
            "user@test.com".equals(ex.getRequest().getHeaders().getFirst("X-User-Email")) &&
            "Bearer token".equals(ex.getRequest().getHeaders().getFirst("Authorization"))
        ));
    }
}
