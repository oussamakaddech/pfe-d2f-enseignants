package tn.esprit.d2f;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Coverage test for the main application class.
 */
class BesoinsFormationApplicationCoverageTest {

    @Test
    void applicationClassInstantiable() {
        BesoinsFormationApplication app = new BesoinsFormationApplication();
        assertNotNull(app);
    }
}
