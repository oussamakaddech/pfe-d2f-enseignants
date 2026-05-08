package tn.esprit.d2f.service;

import org.junit.jupiter.api.Test;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Lightweight unit tests for DTOs and entities used in BesoinFormationService.
 * Avoids Spring context loading to run fast.
 */
class BesoinFormationServiceImplTest {

    @Test
    void besoinFormationRequest_shouldSetAndGetAllFields() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("Formation Java");
        request.setObjectifFormation("Apprendre Java");
        request.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        request.setPriorite(Priorite.HAUTE);
        request.setUsername("user1");
        request.setUp("UP1");
        request.setDepartement("INFO");

        assertEquals("Formation Java", request.getTitre());
        assertEquals("Apprendre Java", request.getObjectifFormation());
        assertEquals(TypeBesoin.INDIVIDUEL, request.getTypeBesoin());
        assertEquals(Priorite.HAUTE, request.getPriorite());
        assertEquals("user1", request.getUsername());
        assertEquals("UP1", request.getUp());
        assertEquals("INFO", request.getDepartement());
    }

    @Test
    void besoinFormationResponse_shouldSetAndGetAllFields() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setIdBesoinFormation(1L);
        response.setTitre("Formation Spring");
        response.setObjectifFormation("Learn Spring");

        assertEquals(1L, response.getIdBesoinFormation());
        assertEquals("Formation Spring", response.getTitre());
        assertEquals("Learn Spring", response.getObjectifFormation());
    }

    @Test
    void besoinFormation_entity_shouldSetApprovalFlags() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setTitre("Test Formation");
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(false);
        besoin.setApprouveAdmin(true);
        besoin.setEventPublished(false);

        assertTrue(besoin.isApprouveCUP());
        assertFalse(besoin.isApprouveChefDep());
        assertTrue(besoin.getApprouveAdmin());
        assertFalse(besoin.getEventPublished());
    }

    @Test
    void priorite_enum_shouldHaveExpectedValues() {
        assertNotNull(Priorite.HAUTE);
        assertNotNull(Priorite.MOYENNE);
        assertNotNull(Priorite.BASSE);
        assertNotNull(Priorite.CRITIQUE);
        assertEquals(4, Priorite.values().length);
    }

    @Test
    void typeBesoin_enum_shouldHaveExpectedValues() {
        assertNotNull(TypeBesoin.INDIVIDUEL);
        assertNotNull(TypeBesoin.COLLECTIF);
    }

    @Test
    void besoinFormation_entity_defaultValues() {
        BesoinFormation besoin = new BesoinFormation();
        assertNull(besoin.getApprouveAdmin());
        assertFalse(besoin.getEventPublished());
    }

    @Test
    void besoinFormation_setUsername_shouldStore() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setUsername("testuser@esprit.tn");
        assertEquals("testuser@esprit.tn", besoin.getUsername());
    }
}
