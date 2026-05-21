package tn.esprit.d2f.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlywayConfigTest {

    @Mock
    private Flyway flyway;

    private FlywayConfig flywayConfig;

    @Test
    void testRepairAndMigrateStrategyBean() {
        flywayConfig = new FlywayConfig();
        FlywayMigrationStrategy strategy = flywayConfig.repairAndMigrate();

        assertNotNull(strategy);
    }

    @Test
    void testRepairAndMigrateCallsRepairAndMigrate() {
        flywayConfig = new FlywayConfig();
        FlywayMigrationStrategy strategy = flywayConfig.repairAndMigrate();

        strategy.migrate(flyway);

        verify(flyway, times(1)).repair();
        verify(flyway, times(1)).migrate();
    }

    @Test
    void testRepairAndMigrateOrderIsCorrect() {
        flywayConfig = new FlywayConfig();
        FlywayMigrationStrategy strategy = flywayConfig.repairAndMigrate();

        // Execute strategy
        strategy.migrate(flyway);

        // Verify repair is called first, then migrate
        InOrder inOrder = inOrder(flyway);
        inOrder.verify(flyway).repair();
        inOrder.verify(flyway).migrate();
    }

    @Test
    void testMultipleCallsToGetBean() {
        flywayConfig = new FlywayConfig();
        
        FlywayMigrationStrategy strategy1 = flywayConfig.repairAndMigrate();
        FlywayMigrationStrategy strategy2 = flywayConfig.repairAndMigrate();

        // Both should be non-null
        assertNotNull(strategy1);
        assertNotNull(strategy2);

        // Both should be functional
        strategy1.migrate(flyway);
        verify(flyway).repair();
        verify(flyway).migrate();
    }
}
