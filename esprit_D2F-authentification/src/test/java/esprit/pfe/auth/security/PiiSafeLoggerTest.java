package esprit.pfe.auth.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PiiSafeLoggerTest {

    @ParameterizedTest
    @CsvSource({
        "Contact me at john.doe@example.com for more info, Contact me at *** for more info",
        "Call me at +1-555-123-4567 or 5551234567, Call me at +1-*** or ***",
        "My SSN is 123456789 or 123-45-6789, My SSN is *** or ***",
        "Server IP: 192.168.1.1 and 10.0.0.1, Server IP: *** and ***",
        "Contact john.doe@example.com or call 555-123-4567 from IP 192.168.1.1, Contact *** or call *** from IP ***"
    })
    void testSanitize(String input, String expected) {
        assertEquals(expected, PiiSafeLogger.sanitize(input));
    }

    @Test
    void testSanitizeNull() {
        String result = PiiSafeLogger.sanitize(null);
        assertNull(result);
    }

    @Test
    void testSanitizeNoPII() {
        String input = "This message has no PII data";
        String result = PiiSafeLogger.sanitize(input);
        assertEquals(input, result);
    }

    @Test
    void testGetLogger() {
        Logger logger = PiiSafeLogger.getLogger(PiiSafeLoggerTest.class);
        assertNotNull(logger);
        assertEquals(LoggerFactory.getLogger(PiiSafeLoggerTest.class), logger);
    }

    @Test
    void testInfoLogging() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isInfoEnabled()).thenReturn(true);

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.info(PiiSafeLoggerTest.class, "Test message with email@example.com");

            verify(mockLogger).isInfoEnabled();
            verify(mockLogger).info("Test message with ***");
        }
    }

    @Test
    void testWarnLogging() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isWarnEnabled()).thenReturn(true);

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.warn(PiiSafeLoggerTest.class, "Warning with phone 555-123-4567");

            verify(mockLogger).isWarnEnabled();
            verify(mockLogger).warn("Warning with phone ***");
        }
    }

    @Test
    void testErrorLogging() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isErrorEnabled()).thenReturn(true);
        Exception exception = new RuntimeException("Test exception");

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.error(PiiSafeLoggerTest.class, "Error with SSN 123-45-6789", exception);

            verify(mockLogger).isErrorEnabled();
            verify(mockLogger).error("Error with SSN ***", exception);
        }
    }

    @Test
    void testDebugLogging() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isDebugEnabled()).thenReturn(true);

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.debug(PiiSafeLoggerTest.class, "Debug with IP 192.168.1.1");

            verify(mockLogger).isDebugEnabled();
            verify(mockLogger).debug("Debug with IP ***");
        }
    }

    @Test
    void testInfoLoggingWhenDisabled() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isInfoEnabled()).thenReturn(false);

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.info(PiiSafeLoggerTest.class, "Test message");

            verify(mockLogger).isInfoEnabled();
            verify(mockLogger, never()).info(anyString());
        }
    }

    @Test
    void testWarnLoggingWhenDisabled() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isWarnEnabled()).thenReturn(false);

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.warn(PiiSafeLoggerTest.class, "Test message");

            verify(mockLogger).isWarnEnabled();
            verify(mockLogger, never()).warn(anyString());
        }
    }

    @Test
    void testErrorLoggingWhenDisabled() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isErrorEnabled()).thenReturn(false);
        Exception exception = new RuntimeException("Test exception");

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.error(PiiSafeLoggerTest.class, "Test message", exception);

            verify(mockLogger).isErrorEnabled();
            verify(mockLogger, never()).error(anyString(), any(Throwable.class));
        }
    }

    @Test
    void testDebugLoggingWhenDisabled() {
        Logger mockLogger = mock(Logger.class);
        when(mockLogger.isDebugEnabled()).thenReturn(false);

        // Create a spy to intercept the LoggerFactory.getLogger call
        try (var mockStatic = mockStatic(LoggerFactory.class)) {
            mockStatic.when(() -> LoggerFactory.getLogger(PiiSafeLoggerTest.class)).thenReturn(mockLogger);

            PiiSafeLogger.debug(PiiSafeLoggerTest.class, "Test message");

            verify(mockLogger).isDebugEnabled();
            verify(mockLogger, never()).debug(anyString());
        }
    }
}