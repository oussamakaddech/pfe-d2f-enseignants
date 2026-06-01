package esprit.pfe.servicecertificat.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PdfGenerationException - Tests")
class PdfGenerationExceptionTest {

    @Test
    @DisplayName("Constructor with message only")
    void constructorWithMessage() {
        PdfGenerationException ex = new PdfGenerationException("Test message");
        assertEquals("Test message", ex.getMessage());
        assertNull(ex.getCause());
    }

    @Test
    @DisplayName("Constructor with message and cause")
    void constructorWithMessageAndCause() {
        RuntimeException cause = new RuntimeException("Root cause");
        PdfGenerationException ex = new PdfGenerationException("Test message", cause);
        assertEquals("Test message", ex.getMessage());
        assertEquals(cause, ex.getCause());
    }

    @Test
    @DisplayName("Exception should be catchable as RuntimeException")
    void isRuntimeException() {
        PdfGenerationException ex = new PdfGenerationException("Test");
        assertTrue(ex instanceof RuntimeException);
    }

    @Test
    @DisplayName("Exception message should be accessible")
    void messageAccessible() {
        String expectedMessage = "PDF generation failed due to IO error";
        PdfGenerationException ex = new PdfGenerationException(expectedMessage);
        assertTrue(ex.getMessage().contains("PDF generation failed"));
    }
}