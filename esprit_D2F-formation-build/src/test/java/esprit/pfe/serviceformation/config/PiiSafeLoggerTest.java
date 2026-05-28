
package esprit.pfe.serviceformation.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PiiSafeLogger - Tests unitaires")
class PiiSafeLoggerTest {

    @Test
    @DisplayName("sanitize - retourne null quand le message est null")
    void sanitizeShouldReturnNullWhenMessageIsNull() {
        assertNull(PiiSafeLogger.sanitize(null));
    }

    @Test
    @DisplayName("sanitize - masque les adresses email")
    void sanitizeShouldMaskEmails() {
        String input = "Contact user@example.com for info";
        String result = PiiSafeLogger.sanitize(input);
        assertFalse(result.contains("user@example.com"));
        assertTrue(result.contains("***@***.***"));
    }

    @Test
    @DisplayName("sanitize - masque les numéros de téléphone")
    void sanitizeShouldMaskPhoneNumbers() {
        String input = "Call +216 12345678 for help";
        String result = PiiSafeLogger.sanitize(input);
        assertFalse(result.contains("12345678"));
    }

    @Test
    @DisplayName("sanitize - masque les adresses IP")
    void sanitizeShouldMaskIpAddresses() {
        String input = "Server at 192.168.1.100 responded";
        String result = PiiSafeLogger.sanitize(input);
        assertFalse(result.contains("192.168.1.100"));
        assertTrue(result.contains("*.*.*.*"));
    }

    @Test
    @DisplayName("sanitize - retourne la chaîne inchangée si aucun PII")
    void sanitizeShouldReturnSameStringWhenNoPii() {
        String input = "No sensitive data here";
        assertEquals(input, PiiSafeLogger.sanitize(input));
    }

    @Test
    @DisplayName("sanitize - masque plusieurs types de PII dans un même message")
    void sanitizeShouldMaskMultiplePiiTypes() {
        String input = "Email: admin@test.com, Phone: +21698765432, IP: 10.0.0.1";
        String result = PiiSafeLogger.sanitize(input);
        assertFalse(result.contains("admin@test.com"));
        assertFalse(result.contains("10.0.0.1"));
        assertTrue(result.contains("***@***.***"));
        assertTrue(result.contains("*.*.*.*"));
    }

    @Test
    @DisplayName("getLogger - retourne un Logger non null")
    void getLoggerShouldReturnNonNullLogger() {
        Logger logger = PiiSafeLogger.getLogger(PiiSafeLoggerTest.class);
        assertNotNull(logger);
    }

    @Test
    @DisplayName("info - ne lève pas d'exception")
    void infoShouldNotThrow() {
        assertDoesNotThrow(() -> PiiSafeLogger.info(PiiSafeLoggerTest.class, "Info message with email@test.com"));
    }

    @Test
    @DisplayName("warn - ne lève pas d'exception")
    void warnShouldNotThrow() {
        assertDoesNotThrow(() -> PiiSafeLogger.warn(PiiSafeLoggerTest.class, "Warn message with email@test.com"));
    }

    @Test
    @DisplayName("error - ne lève pas d'exception")
    void errorShouldNotThrow() {
        assertDoesNotThrow(() -> PiiSafeLogger.error(PiiSafeLoggerTest.class, "Error message", new RuntimeException("test")));
    }

    @Test
    @DisplayName("debug - ne lève pas d'exception")
    void debugShouldNotThrow() {
        assertDoesNotThrow(() -> PiiSafeLogger.debug(PiiSafeLoggerTest.class, "Debug message with email@test.com"));
    }

    @Test
    @DisplayName("sanitize - chaîne vide retourne chaîne vide")
    void sanitizeShouldReturnEmptyStringForEmptyInput() {
        assertEquals("", PiiSafeLogger.sanitize(""));
    }

    @Test
    @DisplayName("sanitize - masque un numéro SSN")
    void sanitizeShouldMaskSsn() {
        String input = "SSN: 1234567890";
        String result = PiiSafeLogger.sanitize(input);
        assertFalse(result.contains("1234567890"));
    }
}
