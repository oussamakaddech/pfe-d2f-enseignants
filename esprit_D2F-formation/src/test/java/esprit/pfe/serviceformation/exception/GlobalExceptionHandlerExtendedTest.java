package esprit.pfe.serviceformation.exception;

import feign.FeignException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerExtendedTest {

    private MockMvc mockMvc;

    // Minimal controller exposing only the endpoints we need
    @org.springframework.web.bind.annotation.RestController
    static class TestController {

        @org.springframework.web.bind.annotation.GetMapping("/test-duplicate-enseignant")
        public void throwDuplicateEnseignant() {
            throw new DuplicateEnseignantException("Email already exists: prof@esprit.tn");
        }

        @org.springframework.web.bind.annotation.GetMapping("/test-microsoft-graph")
        public void throwMicrosoftGraph() {
            throw new MicrosoftGraphException("Graph API timeout", new RuntimeException("connect timed out"));
        }

        @org.springframework.web.bind.annotation.GetMapping("/test-microsoft-graph-no-cause")
        public void throwMicrosoftGraphNoCause() {
            throw new MicrosoftGraphException("Unable to reach Microsoft Graph");
        }

        @org.springframework.web.bind.annotation.GetMapping("/test-invalid-api-usage")
        public void throwInvalidApiUsage() {
            throw new InvalidDataAccessApiUsageException(
                    "Invalid entity state", new RuntimeException("detached entity passed to persist"));
        }

    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ==================== DuplicateEnseignantException ====================

    @Test
    void handleDuplicateEnseignant_returns409() throws Exception {
        mockMvc.perform(get("/test-duplicate-enseignant"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("FORM-ENSEIGNANT-409"))
                .andExpect(jsonPath("$.message").value("Email already exists: prof@esprit.tn"))
                .andExpect(jsonPath("$.path").value("/test-duplicate-enseignant"))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    // ==================== MicrosoftGraphException ====================

    @Test
    void handleMicrosoftGraph_returns503_withCause() throws Exception {
        mockMvc.perform(get("/test-microsoft-graph"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode").value("FORM-503"))
                .andExpect(jsonPath("$.message").value(
                        "Le service externe (Microsoft Graph) est temporairement indisponible. Veuillez réessayer plus tard."))
                .andExpect(jsonPath("$.path").value("/test-microsoft-graph"));
    }

    @Test
    void handleMicrosoftGraph_returns503_withoutCause() throws Exception {
        mockMvc.perform(get("/test-microsoft-graph-no-cause"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode").value("FORM-503"))
                .andExpect(jsonPath("$.message").value(
                        "Le service externe (Microsoft Graph) est temporairement indisponible. Veuillez réessayer plus tard."));
    }

    // ==================== InvalidDataAccessApiUsageException ====================

    @Test
    void handleInvalidApiUsage_returns400() throws Exception {
        mockMvc.perform(get("/test-invalid-api-usage"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("FORM-400"))
                .andExpect(jsonPath("$.message").value(
                        "Requête invalide : une référence (UP, département…) est introuvable ou mal formée."))
                .andExpect(jsonPath("$.path").value("/test-invalid-api-usage"));
    }

    // ==================== FeignException (direct handler tests) ====================

    @Test
    void handleFeign_upstream409_returns409() throws Exception {
        // Create a controller that directly throws a mocked FeignException
        @org.springframework.web.bind.annotation.RestController
        class FeignController {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(409);
                when(fe.contentUTF8()).thenReturn("{\"message\":\"Email already taken\"}");
                when(fe.getMessage()).thenReturn("Conflict");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-409"))
                .andExpect(jsonPath("$.message").value("Email already taken"));
    }

    @Test
    void handleFeign_upstream500_returns500() throws Exception {
        @org.springframework.web.bind.annotation.RestController
        class FeignController500 {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-500")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(500);
                when(fe.contentUTF8()).thenReturn("{\"message\":\"Internal server error upstream\"}");
                when(fe.getMessage()).thenReturn("Internal Server Error");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignController500())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-500"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-500"))
                .andExpect(jsonPath("$.message").value("Internal server error upstream"));
    }

    @Test
    void handleFeign_upstream403_returns403() throws Exception {
        @org.springframework.web.bind.annotation.RestController
        class FeignController403 {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-403")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(403);
                when(fe.contentUTF8()).thenReturn("{\"message\":\"Insufficient permissions\"}");
                when(fe.getMessage()).thenReturn("Forbidden");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignController403())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-403"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-403"))
                .andExpect(jsonPath("$.message").value("Insufficient permissions"));
    }

    @Test
    void handleFeign_emptyBody_usesDefaultMessage() throws Exception {
        @org.springframework.web.bind.annotation.RestController
        class FeignControllerEmpty {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-empty")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(401);
                when(fe.contentUTF8()).thenReturn("");
                when(fe.getMessage()).thenReturn("Unauthorized");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignControllerEmpty())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-empty"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-401"))
                .andExpect(jsonPath("$.message").value("Le service d'authentification a refusé la requête."));
    }

    @Test
    void handleFeign_nullBody_usesDefaultMessage() throws Exception {
        @org.springframework.web.bind.annotation.RestController
        class FeignControllerNull {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-null")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(401);
                when(fe.contentUTF8()).thenReturn(null);
                when(fe.getMessage()).thenReturn("Unauthorized");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignControllerNull())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-null"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-401"))
                .andExpect(jsonPath("$.message").value("Le service d'authentification a refusé la requête."));
    }

    @Test
    void handleFeign_invalidJson_usesDefaultMessage() throws Exception {
        @org.springframework.web.bind.annotation.RestController
        class FeignControllerBadJson {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-badjson")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(502);
                when(fe.contentUTF8()).thenReturn("not json at all");
                when(fe.getMessage()).thenReturn("Bad Gateway");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignControllerBadJson())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-badjson"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-502"))
                .andExpect(jsonPath("$.message").value("Le service d'authentification a refusé la requête."));
    }

    @Test
    void handleFeign_jsonWithoutMessageField_usesDefaultMessage() throws Exception {
        @org.springframework.web.bind.annotation.RestController
        class FeignControllerNoMsg {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-nomsg")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(502);
                when(fe.contentUTF8()).thenReturn("{\"error\":\"some other field\"}");
                when(fe.getMessage()).thenReturn("Bad Gateway");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignControllerNoMsg())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-nomsg"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-502"))
                .andExpect(jsonPath("$.message").value("Le service d'authentification a refusé la requête."));
    }

    @Test
    void handleFeign_negativeStatus_fallbackToBadGateway() throws Exception {
        // status -1 = unreachable service / timeout
        @org.springframework.web.bind.annotation.RestController
        class FeignControllerTimeout {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-timeout")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(-1);
                when(fe.contentUTF8()).thenReturn(null);
                when(fe.getMessage()).thenReturn("Connection refused");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignControllerTimeout())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-timeout"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-502"))
                .andExpect(jsonPath("$.message").value("Le service d'authentification a refusé la requête."));
    }

    @Test
    void handleFeign_unresolvableStatus_fallbackToBadGateway() throws Exception {
        // status 999 is not a valid HttpStatus code
        @org.springframework.web.bind.annotation.RestController
        class FeignControllerInvalid {
            @org.springframework.web.bind.annotation.GetMapping("/test-feign-invalid")
            public void throwFeign() {
                FeignException fe = mock(FeignException.class);
                when(fe.status()).thenReturn(999);
                when(fe.contentUTF8()).thenReturn(null);
                when(fe.getMessage()).thenReturn("Unknown");
                throw fe;
            }
        }

        MockMvc feignMockMvc = MockMvcBuilders.standaloneSetup(new FeignControllerInvalid())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        feignMockMvc.perform(get("/test-feign-invalid"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.errorCode").value("FORM-UPSTREAM-502"));
    }
}
