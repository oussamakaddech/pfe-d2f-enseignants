package tn.esprit.d2f.mapper;

import org.junit.jupiter.api.Test;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import static org.junit.jupiter.api.Assertions.*;

class BesoinFormationMapperTest {

    private final BesoinFormationMapper mapper = new BesoinFormationMapper();

    @Test
    void toEntity_shouldMapAllFields() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername("user1");
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setTitre("Titre");
        request.setObjectifFormation("Objectif");
        request.setNbMaxParticipants(10);
        request.setDureeFormation(5);
        request.setTheme("Theme");
        request.setUp("UP1");
        request.setDepartement("DEP1");
        request.setPriorite(Priorite.HAUTE);

        BesoinFormation entity = mapper.toEntity(request);

        assertNotNull(entity);
        assertEquals("user1", entity.getUsername());
        assertEquals(TypeBesoin.COLLECTIF, entity.getTypeBesoin());
        assertEquals("Titre", entity.getTitre());
        assertEquals(Priorite.HAUTE, entity.getPriorite());
    }

    @Test
    void toEntity_null_shouldReturnNull() {
        assertNull(mapper.toEntity(null));
    }

    @Test
    void toResponse_shouldMapAllFields() {
        BesoinFormation entity = new BesoinFormation();
        entity.setIdBesoinFormation(1L);
        entity.setUsername("user1");
        entity.setTitre("Titre");
        entity.setApprouveAdmin(true);
        entity.setNbMaxParticipants(20);
        entity.setDureeFormation(10);

        BesoinFormationResponse response = mapper.toResponse(entity);

        assertNotNull(response);
        assertEquals(1L, response.getIdBesoinFormation());
        assertEquals("user1", response.getUsername());
        assertTrue(response.getApprouveAdmin());
    }

    @Test
    void toResponse_null_shouldReturnNull() {
        assertNull(mapper.toResponse(null));
    }
}
