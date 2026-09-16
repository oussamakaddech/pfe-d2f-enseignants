package tn.esprit.d2f.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class PersistenceConfigTest {

    @Test
    void testConstructor() {
        PersistenceConfig config = new PersistenceConfig();
        assertNotNull(config);
    }
}
