
package tn.esprit.d2f.competence.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.*;

@DisplayName("FlywayConfig - Tests")
class FlywayConfigTest {

    @Test
    @DisplayName("repairAndMigrate: doit appeler repair puis migrate")
    void repairAndMigrate_shouldCallRepairAndMigrate() {
        FlywayConfig config = new FlywayConfig();
        Flyway flyway = mock(Flyway.class);

        config.repairAndMigrate().migrate(flyway);

        verify(flyway, times(1)).repair();
        verify(flyway, times(1)).migrate();
    }
}
