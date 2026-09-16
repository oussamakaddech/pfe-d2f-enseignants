package esprit.pfe.serviceformation.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class MicrosoftGraphExceptionTest {

    @Test
    void singleArgumentConstructorShouldSetDefaults() {
        MicrosoftGraphException exception = new MicrosoftGraphException("boom");

        assertEquals("boom", exception.getMessage());
        assertEquals("Microsoft Graph", exception.getServiceName());
        assertEquals(0, exception.getStatusCode());
    }

    @Test
    void messageAndCauseConstructorShouldSetCauseAndDefaults() {
        RuntimeException cause = new RuntimeException("cause");
        MicrosoftGraphException exception = new MicrosoftGraphException("boom", cause);

        assertEquals("boom", exception.getMessage());
        assertSame(cause, exception.getCause());
        assertEquals("Microsoft Graph", exception.getServiceName());
        assertEquals(0, exception.getStatusCode());
    }

    @Test
    void serviceConstructorShouldFormatMessageAndExposeFields() {
        RuntimeException cause = new RuntimeException("cause");
        MicrosoftGraphException exception = new MicrosoftGraphException("Outlook", "Unavailable", 503, cause);

        assertEquals("Outlook: Unavailable (status: 503)", exception.getMessage());
        assertSame(cause, exception.getCause());
        assertEquals("Outlook", exception.getServiceName());
        assertEquals(503, exception.getStatusCode());
    }
}
