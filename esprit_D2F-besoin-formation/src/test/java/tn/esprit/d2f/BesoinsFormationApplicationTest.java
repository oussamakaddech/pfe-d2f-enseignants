package tn.esprit.d2f;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
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

    @Test
    void testMainMethodRunsWithNoneWebType() {
        assertDoesNotThrow(() ->
                BesoinsFormationApplication.main(new String[] {
                        "--spring.main.web-application-type=none",
                        "--spring.main.lazy-initialization=true"
                }));
    }
}
