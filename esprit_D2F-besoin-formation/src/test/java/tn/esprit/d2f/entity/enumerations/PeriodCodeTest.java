package tn.esprit.d2f.entity.enumerations;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PeriodCodeTest {

    @Test
    void testPeriodCodeValues() {
        PeriodCode[] codes = PeriodCode.values();

        assertNotNull(codes);
        assertTrue(codes.length > 0);
    }

    @Test
    void testPeriodCodeP1() {
        PeriodCode code = PeriodCode.P1;

        assertEquals("P1", code.name());
    }

    @Test
    void testPeriodCodeP2() {
        PeriodCode code = PeriodCode.P2;

        assertEquals("P2", code.name());
    }

    @Test
    void testPeriodCodeP3() {
        PeriodCode code = PeriodCode.P3;

        assertEquals("P3", code.name());
    }

    @Test
    void testPeriodCodeP4() {
        PeriodCode code = PeriodCode.P4;

        assertEquals("P4", code.name());
    }

    @Test
    void testValueOf() {
        PeriodCode code = PeriodCode.valueOf("P1");

        assertEquals(PeriodCode.P1, code);
    }

    @Test
    void testValueOfInvalid() {
        assertThrows(IllegalArgumentException.class, () -> PeriodCode.valueOf("INVALID"));
    }
}
