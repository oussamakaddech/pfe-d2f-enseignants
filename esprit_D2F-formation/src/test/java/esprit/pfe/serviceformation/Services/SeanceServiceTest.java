package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.utils.ValidationUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Time;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeanceServiceTest {

    @Mock private SeanceFormationRepository seanceRepo;
    @Mock private ValidationUtils validation;
    @InjectMocks private SeanceService service;

    @Test
    void testGetAllSeances() {
        SeanceFormation s = new SeanceFormation();
        s.setIdSeance(1L);
        when(seanceRepo.findAll()).thenReturn(List.of(s));
        assertFalse(service.getAllSeances().isEmpty());
    }

    @Test
    void testCreateSeance_Success() {
        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(new Date());
        dto.setHeureDebut(Time.valueOf("08:00:00"));
        dto.setHeureFin(Time.valueOf("10:00:00"));
        dto.setAnimateurs(Collections.emptyList());
        dto.setParticipants(Collections.emptyList());

        SeanceFormation entity = new SeanceFormation();
        when(seanceRepo.save(any())).thenReturn(entity);
        
        assertNotNull(service.createSeance(dto));
    }

    @Test
    void testCreateSeance_ConflictAnimateur() {
        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(new Date());
        dto.setHeureDebut(Time.valueOf("08:00:00"));
        dto.setHeureFin(Time.valueOf("10:00:00"));
        
        EnseignantDTO animDto = new EnseignantDTO();
        animDto.setId("A1");
        dto.setAnimateurs(List.of(animDto));

        SeanceFormation existing = new SeanceFormation();
        existing.setHeureDebut(Time.valueOf("07:00:00"));
        existing.setHeureFin(Time.valueOf("09:00:00"));
        
        when(seanceRepo.findByAnimateurAndDate(eq("A1"), any())).thenReturn(List.of(existing));

        assertThrows(IllegalArgumentException.class, () -> service.createSeance(dto));
    }

    @Test
    void testCreateSeance_FilterParticipants() {
        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(new Date());
        dto.setHeureDebut(Time.valueOf("08:00:00"));
        dto.setHeureFin(Time.valueOf("10:00:00"));
        dto.setAnimateurs(Collections.emptyList());
        
        EnseignantDTO p1 = new EnseignantDTO(); p1.setId("P1");
        EnseignantDTO p2 = new EnseignantDTO(); p2.setId("P2");
        dto.setParticipants(List.of(p1, p2));

        SeanceFormation s1 = new SeanceFormation();
        s1.setHeureDebut(Time.valueOf("08:30:00"));
        s1.setHeureFin(Time.valueOf("09:30:00"));
        
        // P1 has conflict, P2 doesn't
        when(seanceRepo.findByParticipantAndDate(eq("P1"), any())).thenReturn(List.of(s1));
        when(seanceRepo.findByParticipantAndDate(eq("P2"), any())).thenReturn(Collections.emptyList());

        SeanceFormation saved = new SeanceFormation();
        saved.setParticipants(new ArrayList<>());
        when(seanceRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        
        SeanceDTO result = service.createSeance(dto);
        assertEquals(1, result.getParticipants().size());
        assertEquals("P2", result.getParticipants().get(0).getId());
    }

    @Test
    void testUpdateSeance_Conflict() {
        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(1L);
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));
        
        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(new Date());
        dto.setHeureDebut(Time.valueOf("08:00:00"));
        dto.setHeureFin(Time.valueOf("10:00:00"));
        
        EnseignantDTO animDto = new EnseignantDTO();
        animDto.setId("A1");
        dto.setAnimateurs(List.of(animDto));
        dto.setParticipants(Collections.emptyList());

        SeanceFormation other = new SeanceFormation();
        other.setIdSeance(2L);
        other.setHeureDebut(Time.valueOf("09:30:00"));
        other.setHeureFin(Time.valueOf("11:00:00"));
        
        when(seanceRepo.findByAnimateurAndDate(eq("A1"), any())).thenReturn(List.of(other));

        assertThrows(IllegalArgumentException.class, () -> service.updateSeance(1L, dto));
    }

    @Test
    void testDeleteSeance_NotFound() {
        when(seanceRepo.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.deleteSeance(1L));
    }
}
