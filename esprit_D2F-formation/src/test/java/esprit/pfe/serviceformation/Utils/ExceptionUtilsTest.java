package esprit.pfe.serviceformation.Utils;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests complets pour ExceptionUtils
 * Couverture: 100%
 */
@DisplayName("Tests pour ExceptionUtils")
class ExceptionUtilsTest {

    // Tests pour invalidArgument()
    @Test
    @DisplayName("invalidArgument() - Lance IllegalArgumentException avec le message spécifié")
    void testInvalidArgument_ShouldThrowIllegalArgumentException() {
        String message = "Test error message";

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.invalidArgument(message)
        );

        assertEquals(message, exception.getMessage());
    }

    @Test
    @DisplayName("invalidArgument() - Lance IllegalArgumentException avec message vide")
    void testInvalidArgument_WithEmptyMessage_ShouldThrow() {
        String message = "";

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.invalidArgument(message)
        );

        assertEquals(message, exception.getMessage());
    }

    @Test
    @DisplayName("invalidArgument() - Lance IllegalArgumentException avec message null")
    void testInvalidArgument_WithNullMessage_ShouldThrow() {
        String message = null;

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.invalidArgument(message)
        );

        assertNull(exception.getMessage());
    }

    // Tests pour invalidState()
    @Test
    @DisplayName("invalidState() - Lance IllegalStateException avec le message spécifié")
    void testInvalidState_ShouldThrowIllegalStateException() {
        String message = "Test error message";

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.invalidState(message)
        );

        assertEquals(message, exception.getMessage());
    }

    @Test
    @DisplayName("invalidState() - Lance IllegalStateException avec message vide")
    void testInvalidState_WithEmptyMessage_ShouldThrow() {
        String message = "";

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.invalidState(message)
        );

        assertEquals(message, exception.getMessage());
    }

    @Test
    @DisplayName("invalidState() - Lance IllegalStateException avec message null")
    void testInvalidState_WithNullMessage_ShouldThrow() {
        String message = null;

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.invalidState(message)
        );

        assertNull(exception.getMessage());
    }

    // Tests pour invalidState() avec cause
    @Test
    @DisplayName("invalidState() avec cause - Lance IllegalStateException avec message et cause")
    void testInvalidStateWithCause_ShouldThrowIllegalStateExceptionWithCause() {
        String message = "Test error message";
        Throwable cause = new RuntimeException("Original exception");

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.invalidState(message, cause)
        );

        assertEquals(message, exception.getMessage());
        assertEquals(cause, exception.getCause());
    }

    @Test
    @DisplayName("invalidState() avec cause - Lance IllegalStateException avec cause null")
    void testInvalidStateWithNullCause_ShouldThrowIllegalStateException() {
        String message = "Test error message";

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.invalidState(message, null)
        );

        assertEquals(message, exception.getMessage());
        assertNull(exception.getCause());
    }

    // Tests pour orElseThrow() avec Optional et ressource
    @Test
    @DisplayName("orElseThrow() avec ressource - Retourne la valeur quand Optional est présent")
    void testOrElseThrow_WithPresentOptional_ShouldReturnValue() {
        String value = "test value";
        Optional<String> optional = Optional.of(value);

        String result = ExceptionUtils.orElseThrow(optional, "Resource", 1L);

        assertEquals(value, result);
    }

    @Test
    @DisplayName("orElseThrow() avec ressource - Lance exception quand Optional est vide")
    void testOrElseThrow_WithEmptyOptional_ShouldThrow() {
        Optional<String> optional = Optional.empty();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.orElseThrow(optional, "Resource", 1L)
        );

        assertEquals("Resource introuvable avec l'id: 1", exception.getMessage());
    }

    @Test
    @DisplayName("orElseThrow() avec ressource - Lance exception avec ID null")
    void testOrElseThrow_WithEmptyOptionalAndNullId_ShouldThrow() {
        Optional<String> optional = Optional.empty();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.orElseThrow(optional, "Resource", null)
        );

        assertEquals("Resource introuvable avec l'id: null", exception.getMessage());
    }

    @Test
    @DisplayName("orElseThrow() avec ressource - Lance exception avec ID String")
    void testOrElseThrow_WithEmptyOptionalAndStringId_ShouldThrow() {
        Optional<String> optional = Optional.empty();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.orElseThrow(optional, "Resource", "ABC123")
        );

        assertEquals("Resource introuvable avec l'id: ABC123", exception.getMessage());
    }

    // Tests pour orElseThrow() avec Optional et message
    @Test
    @DisplayName("orElseThrow() avec message - Retourne la valeur quand Optional est présent")
    void testOrElseThrowWithMessage_WithPresentOptional_ShouldReturnValue() {
        String value = "test value";
        Optional<String> optional = Optional.of(value);

        String result = ExceptionUtils.orElseThrow(optional, "Custom error message");

        assertEquals(value, result);
    }

    @Test
    @DisplayName("orElseThrow() avec message - Lance exception quand Optional est vide")
    void testOrElseThrowWithMessage_WithEmptyOptional_ShouldThrow() {
        Optional<String> optional = Optional.empty();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.orElseThrow(optional, "Custom error message")
        );

        assertEquals("Custom error message", exception.getMessage());
    }

    @Test
    @DisplayName("orElseThrow() avec message - Lance exception avec message vide")
    void testOrElseThrowWithMessage_WithEmptyOptionalAndEmptyMessage_ShouldThrow() {
        Optional<String> optional = Optional.empty();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> ExceptionUtils.orElseThrow(optional, "")
        );

        assertEquals("", exception.getMessage());
    }

    // Tests pour wrapAsStateException()
    @Test
    @DisplayName("wrapAsStateException() - Lance IllegalStateException avec message et cause")
    void testWrapAsStateException_ShouldThrowIllegalStateExceptionWithCause() {
        Exception originalException = new RuntimeException("Original exception");
        String contextMessage = "Error in processing";

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.wrapAsStateException(originalException, contextMessage)
        );

        assertEquals("Error in processing: Original exception", exception.getMessage());
        assertEquals(originalException, exception.getCause());
    }

    @Test
    @DisplayName("wrapAsStateException() - Lance IllegalStateException avec cause null")
    void testWrapAsStateException_WithNullCause_ShouldThrow() {
        String contextMessage = "Error in processing";

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.wrapAsStateException(null, contextMessage)
        );

        assertEquals("Error in processing: null", exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    @DisplayName("wrapAsStateException() - Lance IllegalStateException avec message vide")
    void testWrapAsStateException_WithEmptyContextMessage_ShouldThrow() {
        Exception originalException = new RuntimeException("Original exception");

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.wrapAsStateException(originalException, "")
        );

        assertEquals(": Original exception", exception.getMessage());
        assertEquals(originalException, exception.getCause());
    }

    @Test
    @DisplayName("wrapAsStateException() - Lance IllegalStateException avec cause ayant message null")
    void testWrapAsStateException_WithExceptionHavingNullMessage_ShouldThrow() {
        Exception originalException = new RuntimeException((String) null);
        String contextMessage = "Error in processing";

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> ExceptionUtils.wrapAsStateException(originalException, contextMessage)
        );

        assertEquals("Error in processing: null", exception.getMessage());
        assertEquals(originalException, exception.getCause());
    }
}
