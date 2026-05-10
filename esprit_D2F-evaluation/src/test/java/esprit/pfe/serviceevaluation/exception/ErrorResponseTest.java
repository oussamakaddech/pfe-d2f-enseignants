package esprit.pfe.serviceevaluation.exception;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ErrorResponseTest {

    @Test
    void testErrorResponse() {
        String now = "2026-05-09T22:18:22";
        ErrorResponse er1 = ErrorResponse.builder()
                .status(404)
                .message("Not Found")
                .timestamp(now)
                .path("/api")
                .errorCode("ERR_404")
                .traceId("trace-123")
                .build();

        ErrorResponse er2 = new ErrorResponse(now, 404, "ERR_404", "Not Found", "/api", "trace-123");

        assertEquals(404, er1.getStatus());
        assertEquals("Not Found", er1.getMessage());
        assertEquals(now, er1.getTimestamp());
        assertEquals("/api", er1.getPath());
        assertEquals("ERR_404", er1.getErrorCode());
        assertEquals("trace-123", er1.getTraceId());

        assertEquals(er1, er2);
        assertEquals(er1.hashCode(), er2.hashCode());
        assertNotNull(er1.toString());
        
        // Test builder directly
        ErrorResponse er3 = ErrorResponse.builder().status(200).build();
        assertEquals(200, er3.getStatus());
    }
}
