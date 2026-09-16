package tn.esprit.d2f.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PersistenceConfigImprovedTest {

    @Test
    void testConstructor() {
        PersistenceConfig config = new PersistenceConfig();
        assertNotNull(config);
    }

    @Test
    void testMultipleInstances() {
        PersistenceConfig config1 = new PersistenceConfig();
        PersistenceConfig config2 = new PersistenceConfig();

        assertNotNull(config1);
        assertNotNull(config2);
        assertNotSame(config1, config2);
    }
}
