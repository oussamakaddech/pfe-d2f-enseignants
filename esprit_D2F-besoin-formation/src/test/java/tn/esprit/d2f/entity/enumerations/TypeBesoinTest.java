package tn.esprit.d2f.entity.enumerations;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TypeBesoinTest {

    @Test
    void testTypeBesoinValues() {
        TypeBesoin[] types = TypeBesoin.values();

        assertNotNull(types);
        assertTrue(types.length > 0);
    }

    @Test
    void testTypeBesoinCOLLECTIF() {
        TypeBesoin type = TypeBesoin.COLLECTIF;

        assertEquals("COLLECTIF", type.name());
    }

    @Test
    void testTypeBesoinINDIVIDUEL() {
        TypeBesoin type = TypeBesoin.INDIVIDUEL;

        assertEquals("INDIVIDUEL", type.name());
    }

    @Test
    void testTypeBesoinANIMER_UNE_FORMATION() {
        TypeBesoin type = TypeBesoin.ANIMER_UNE_FORMATION;

        assertEquals("ANIMER_UNE_FORMATION", type.name());
    }

    @Test
    void testValueOf() {
        TypeBesoin type = TypeBesoin.valueOf("COLLECTIF");

        assertEquals(TypeBesoin.COLLECTIF, type);
    }

    @Test
    void testValueOfInvalid() {
        assertThrows(IllegalArgumentException.class, () -> TypeBesoin.valueOf("INVALID"));
    }

    @Test
    void testTypeBesoinEquality() {
        TypeBesoin type1 = TypeBesoin.COLLECTIF;
        TypeBesoin type2 = TypeBesoin.COLLECTIF;
        TypeBesoin type3 = TypeBesoin.INDIVIDUEL;

        assertEquals(type1, type2);
        assertNotEquals(type1, type3);
    }
}
