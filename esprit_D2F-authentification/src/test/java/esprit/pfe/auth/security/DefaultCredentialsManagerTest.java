package esprit.pfe.auth.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DefaultCredentialsManagerTest {

    @AfterEach
    void tearDown() {
        System.clearProperty("spring.profiles.active");
    }

    @Test
    void constructor_InDev_ShouldNotThrowEvenWithDefaultPassword() {
        // Arrange
        System.setProperty("spring.profiles.active", "dev");

        // Act & Assert
        assertDoesNotThrow(() -> new DefaultCredentialsManager(
            "admin", "CHANGE_ME_IN_PRODUCTION", "System", "Admin", "0000", "admin@d2f.local"
        ));
    }

    @Test
    void constructor_InProd_WithDefaultPassword_ShouldThrowException() {
        // Arrange
        System.setProperty("spring.profiles.active", "prod");

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> 
            new DefaultCredentialsManager(
                "admin", "CHANGE_ME_IN_PRODUCTION", "System", "Admin", "0000", "admin@d2f.local"
            )
        );
        assertTrue(exception.getMessage().contains("trop faible ou non configuré"));
    }

    @Test
    void constructor_InProd_WithCustomPassword_ShouldNotThrow() {
        // Arrange
        System.setProperty("spring.profiles.active", "prod");

        // Act & Assert
        assertDoesNotThrow(() -> new DefaultCredentialsManager(
            "admin", "MySuperSecretProdPassword", "System", "Admin", "0000", "admin@d2f.local"
        ));
    }

    @Test
    void getters_ShouldReturnCorrectValues() {
        // Act
        DefaultCredentialsManager manager = new DefaultCredentialsManager(
            "u", "p", "f", "l", "0", "e"
        );

        // Assert
        assertEquals("u", manager.getDefaultAdminUsername());
        assertEquals("p", manager.getDefaultAdminPassword());
        assertEquals("f", manager.getDefaultAdminFirstName());
        assertEquals("l", manager.getDefaultAdminLastName());
        assertEquals("0", manager.getDefaultAdminPhone());
        assertEquals("e", manager.getDefaultAdminEmail());
    }
}
