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
    void testPeriodCodeWinter() {
        PeriodCode code = PeriodCode.WINTER;
        assertEquals("WINTER", code.name());
    }

    @Test
    void testPeriodCodeSummer() {
        PeriodCode code = PeriodCode.SUMMER;
        assertEquals("SUMMER", code.name());
    }

    @Test
    void testPeriodCodeSprint() {
        PeriodCode code = PeriodCode.SPRINT;
        assertEquals("SPRINT", code.name());
    }

    @Test
    void testPeriodCodeWorkshop() {
        PeriodCode code = PeriodCode.WORKSHOP;
        assertEquals("WORKSHOP", code.name());
    }

    @Test
    void testValueOf() {
        PeriodCode code = PeriodCode.valueOf("SPRINT");
        assertEquals(PeriodCode.SPRINT, code);
    }

    @Test
    void testValueOfInvalid() {
        assertThrows(IllegalArgumentException.class, () -> PeriodCode.valueOf("INVALID"));
    }
}
