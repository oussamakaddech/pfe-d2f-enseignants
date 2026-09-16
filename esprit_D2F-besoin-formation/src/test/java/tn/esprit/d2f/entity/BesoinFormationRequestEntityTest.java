package tn.esprit.d2f.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the entity-level BesoinFormationRequest wrapper class.
 */
class BesoinFormationRequestEntityTest {

    @Test
    void testGetSetBesoinFormation() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(1L);
        besoin.setTitre("Test");

        request.setBesoinFormation(besoin);

        assertNotNull(request.getBesoinFormation());
        assertEquals(1L, request.getBesoinFormation().getIdBesoinFormation());
        assertEquals("Test", request.getBesoinFormation().getTitre());
    }

    @Test
    void testGetSetCommentaire() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setCommentaire("Un commentaire");

        assertEquals("Un commentaire", request.getCommentaire());
    }

    @Test
    void testDefaultValues() {
        BesoinFormationRequest request = new BesoinFormationRequest();

        assertNull(request.getBesoinFormation());
        assertNull(request.getCommentaire());
    }

    @Test
    void testSetBesoinFormationToNull() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        BesoinFormation besoin = new BesoinFormation();
        request.setBesoinFormation(besoin);
        assertNotNull(request.getBesoinFormation());

        request.setBesoinFormation(null);
        assertNull(request.getBesoinFormation());
    }

    @Test
    void testSetCommentaireToEmpty() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setCommentaire("");
        assertEquals("", request.getCommentaire());
    }
}
