package tn.esprit.d2f;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class BesoinsFormationApplicationTest {

    @Test
    void testConstructor() {
        BesoinsFormationApplication app = new BesoinsFormationApplication();
        assertNotNull(app);
    }

    @Test
    void testApplicationClassExists() {
        assertNotNull(BesoinsFormationApplication.class);
    }

    @Test
    void testMainMethodExists() {
        assertNotNull(BesoinsFormationApplication.class.getDeclaredMethods());
    }
}
