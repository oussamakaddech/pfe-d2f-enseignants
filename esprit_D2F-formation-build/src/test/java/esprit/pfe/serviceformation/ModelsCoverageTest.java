package esprit.pfe.serviceformation;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.DriveSubPath;
import org.junit.jupiter.api.Test;
import java.util.Collections;
import java.util.Date;
import static org.junit.jupiter.api.Assertions.*;

class ModelsCoverageTest {

    @Test
    void testCountHeuresDTO() {
        CountHeuresDTO dto = new CountHeuresDTO();
        dto.setCount(10L);
        dto.setTotalHeures(100L);
        assertEquals(10L, dto.getCount());
        assertEquals(100L, dto.getTotalHeures());

        CountHeuresDTO dto2 = new CountHeuresDTO(5L, 50);
        assertEquals(5L, dto2.getCount());
        assertEquals(50L, dto2.getTotalHeures());
        
        CountHeuresDTO dto3 = new CountHeuresDTO(5L, 50L);
        assertEquals(5L, dto3.getCount());
    }

    @Test
    void testAnimateurFormationDTO() {
        AnimateurFormationDTO dto = new AnimateurFormationDTO("Titre", "Cible", "Objectifs", 20, new Date(), new Date());
        assertEquals("Titre", dto.getTitreFormation());
        dto.setTitreFormation("New");
        assertEquals("New", dto.getTitreFormation());
    }

    @Test
    void testEvaluationFormateurDTO() {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        dto.setEnseignantId("E1");
        assertEquals("E1", dto.getEnseignantId());
    }

    @Test
    void testFormateurNameDTO() {
        FormateurNameDTO dto = new FormateurNameDTO("Nom", "Prenom");
        assertEquals("Nom", dto.getNom());
        assertEquals("Prenom", dto.getPrenom());
        dto.setNom("N");
        dto.setPrenom("P");
        assertEquals("N", dto.getNom());
        assertEquals("P", dto.getPrenom());
    }

    @Test
    void testDriveSubPathEnum() {
        assertNotNull(DriveSubPath.valueOf("DOCUMENT"));
        assertEquals(3, DriveSubPath.values().length);
    }
    
    @Test
    void testParticipantFormationDTO() {
        ParticipantFormationDTO dto = new ParticipantFormationDTO("Titre", java.util.Collections.emptyList(), new Date(), new Date());
        assertEquals("Titre", dto.getTitreFormation());
    }

    @Test
    void testFormationsByRoleDTO() {
        FormationsByRoleDTO dto = new FormationsByRoleDTO();
        dto.setAsAnimateur(Collections.emptyList());
        dto.setAsParticipant(Collections.emptyList());
        assertNotNull(dto.getAsAnimateur());
        assertNotNull(dto.getAsParticipant());
    }

    @Test
    void testFormationsByEtatDTO() {
        FormationsByEtatDTO dto = new FormationsByEtatDTO();
        dto.setAcheve(5);
        dto.setPlanifie(3);
        assertEquals(5, dto.getAcheve());
        assertEquals(3, dto.getPlanifie());
    }

    @Test
    void testFormationsByTypeDTO() {
        FormationsByTypeDTO dto = new FormationsByTypeDTO(1L, 2L, 3L);
        assertEquals(1L, dto.getInterne());
        assertEquals(2L, dto.getExterne());
        assertEquals(3L, dto.getEnLigne());
    }

    @Test
    void testOneDriveItemDTO() {
        OneDriveItemDTO dto = new OneDriveItemDTO();
        dto.setName("File");
        assertEquals("File", dto.getName());
    }

    @Test
    void testEventCreationResult() {
        esprit.pfe.serviceformation.microsoft.OutlookCalendarService.EventCreationResult res = new esprit.pfe.serviceformation.microsoft.OutlookCalendarService.EventCreationResult("ID", "URL");
        assertEquals("ID", res.getEventId());
        assertEquals("URL", res.getJoinUrl());
    }
}
