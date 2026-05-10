package esprit.pfe.serviceformation.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @RestController
    static class TestController {
        @GetMapping("/test-not-found")
        public void throwNotFound() { throw new ResourceNotFoundException("Not found"); }
        
        @GetMapping("/test-access-denied")
        public void throwAccessDenied() { throw new AccessDeniedException("Denied"); }

        @GetMapping("/test-auth-error")
        public void throwAuthError() { throw new BadCredentialsException("Bad creds"); }

        @GetMapping("/test-illegal-arg")
        public void throwIllegalArg() { throw new IllegalArgumentException("Illegal"); }

        @GetMapping("/test-data-integrity")
        public void throwDataIntegrity() { throw new DataIntegrityViolationException("Conflict"); }

        @GetMapping("/test-general")
        public void throwGeneral() throws Exception { throw new Exception("General"); }
    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testHandleNotFound() throws Exception {
        mockMvc.perform(get("/test-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("FORM-404"));
    }

    @Test
    void testHandleAccessDenied() throws Exception {
        mockMvc.perform(get("/test-access-denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORM-403"));
    }

    @Test
    void testHandleAuthentication() throws Exception {
        mockMvc.perform(get("/test-auth-error"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("FORM-401"));
    }

    @Test
    void testHandleIllegalArgument() throws Exception {
        mockMvc.perform(get("/test-illegal-arg"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("FORM-400"));
    }

    @Test
    void testHandleDataIntegrity() throws Exception {
        mockMvc.perform(get("/test-data-integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("FORM-409"));
    }

    @Test
    void testHandleGeneral() throws Exception {
        mockMvc.perform(get("/test-general"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("FORM-500"));
    }
}
