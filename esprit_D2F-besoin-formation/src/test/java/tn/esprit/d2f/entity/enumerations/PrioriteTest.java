package tn.esprit.d2f.entity.enumerations;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PrioriteTest {

    @Test
    void testPrioriteValues() {
        Priorite[] priorites = Priorite.values();

        assertNotNull(priorites);
        assertTrue(priorites.length > 0);
    }

    @Test
    void testPrioriteHAUTE() {
        Priorite priorite = Priorite.HAUTE;

        assertEquals("HAUTE", priorite.name());
    }

    @Test
    void testPrioriteMOYENNE() {
        Priorite priorite = Priorite.MOYENNE;

        assertEquals("MOYENNE", priorite.name());
    }

    @Test
    void testPrioriteBASSE() {
        Priorite priorite = Priorite.BASSE;

        assertEquals("BASSE", priorite.name());
    }

    @Test
    void testValueOf() {
        Priorite priorite = Priorite.valueOf("HAUTE");

        assertEquals(Priorite.HAUTE, priorite);
    }

    @Test
    void testValueOfInvalid() {
        assertThrows(IllegalArgumentException.class, () -> Priorite.valueOf("INVALID"));
    }

    @Test
    void testPrioriteEquality() {
        Priorite priorite1 = Priorite.HAUTE;
        Priorite priorite2 = Priorite.HAUTE;
        Priorite priorite3 = Priorite.MOYENNE;

        assertEquals(priorite1, priorite2);
        assertNotEquals(priorite1, priorite3);
    }
}
