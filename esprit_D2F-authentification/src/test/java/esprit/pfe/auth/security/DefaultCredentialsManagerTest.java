package esprit.pfe.auth.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

class DefaultCredentialsManagerTest {

    private static DefaultCredentialsManager managerWithProfiles(String... profiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return new DefaultCredentialsManager(
                env,
                "admin", "CHANGE_ME_IN_PRODUCTION", "System", "Admin", "0000", "admin@d2f.local"
        );
    }

    @Test
    void constructor_InDev_ShouldNotThrowEvenWithDefaultPassword() {
        assertDoesNotThrow(() -> managerWithProfiles("dev"));
    }

    @Test
    void constructor_InProd_WithDefaultPassword_ShouldThrowException() {
        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
                managerWithProfiles("prod")
        );
        assertTrue(exception.getMessage().contains("trop faible ou non configur"));
    }

    @Test
    void constructor_InProd_WithCustomPassword_ShouldNotThrow() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        assertDoesNotThrow(() -> new DefaultCredentialsManager(
                env,
                "admin", "MySuperSecretProdPassword", "System", "Admin", "0000", "admin@d2f.local"
        ));
    }

    @Test
    void getters_ShouldReturnCorrectValues() {
        MockEnvironment env = new MockEnvironment();
        DefaultCredentialsManager manager = new DefaultCredentialsManager(
                env, "u", "p", "f", "l", "0", "e"
        );

        assertEquals("u", manager.getDefaultAdminUsername());
        assertEquals("p", manager.getDefaultAdminPassword());
        assertEquals("f", manager.getDefaultAdminFirstName());
        assertEquals("l", manager.getDefaultAdminLastName());
        assertEquals("0", manager.getDefaultAdminPhone());
        assertEquals("e", manager.getDefaultAdminEmail());
    }
}
