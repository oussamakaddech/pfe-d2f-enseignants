package esprit.pfe.auth.error;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CustomErrorResponseTest {

    @Test
    void testCustomErrorResponse() {
        CustomErrorResponse response = new CustomErrorResponse();
        response.setStatus(400);
        response.setError("Bad Request");
        response.setErrorCode("ERR-400");
        response.setMessage("Validation failed");
        response.setPath("/api/v1/auth");
        response.setTraceId("uuid-123");
        response.setTimestamp("2026-05-08T22:00:00");

        assertEquals(400, response.getStatus());
        assertEquals("Bad Request", response.getError());
        assertEquals("ERR-400", response.getErrorCode());
        assertEquals("Validation failed", response.getMessage());
        assertEquals("/api/v1/auth", response.getPath());
        assertEquals("uuid-123", response.getTraceId());
        assertEquals("2026-05-08T22:00:00", response.getTimestamp());

        CustomErrorResponse full = new CustomErrorResponse(500, "Server Error", "ERR-500", "Internal Error", "/api/v1/auth", "uuid-500", "2026-05-08T23:00:00");
        assertEquals(500, full.getStatus());
        assertNotNull(full.toString());
    }
}
