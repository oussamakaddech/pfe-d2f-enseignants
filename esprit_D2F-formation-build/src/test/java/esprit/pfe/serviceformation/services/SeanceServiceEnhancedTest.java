package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Tests améliorés pour SeanceService
 * Couvre les cas d'erreur et scénarios complexes
 */
@ExtendWith(MockitoExtension.class)
class SeanceServiceEnhancedTest {

    @Mock private SeanceFormationRepository seanceRepo;
    @Mock private ValidationUtils validation;
    @InjectMocks private SeanceService service;

    @Test
    void testGetAllSeances_Success() {
        SeanceFormation s = new SeanceFormation();
        s.setIdSeance(1L);
        when(seanceRepo.findAll()).thenReturn(List.of(s));

        List<SeanceDTO> result = service.getAllSeances();
        assertFalse(result.isEmpty());
        assertEquals(1L, result.get(0).getIdSeance());
    }

    @Test
    void testGetAllSeances_Empty() {
        when(seanceRepo.findAll()).thenReturn(Collections.emptyList());

        List<SeanceDTO> result = service.getAllSeances();
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetAllSeances_Exception() {
        when(seanceRepo.findAll()).thenThrow(new RuntimeException("Database error"));

        assertThrows(IllegalStateException.class, () -> service.getAllSeances());
    }

    @Test
    void testGetSeanceById_Success() {
        SeanceFormation s = new SeanceFormation();
        s.setIdSeance(1L);
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(s));

        SeanceDTO result = service.getSeanceById(1L);
        assertNotNull(result);
        assertEquals(1L, result.getIdSeance());
    }

    @Test
    void testGetSeanceById_NotFound() {
        when(seanceRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.getSeanceById(999L));
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
        entity.setIdSeance(1L);
        when(seanceRepo.save(any())).thenReturn(entity);

        SeanceDTO result = service.createSeance(dto);
        assertNotNull(result);
        assertEquals(1L, result.getIdSeance());
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
        dto.setParticipants(Collections.emptyList());

        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(2L);
        existing.setHeureDebut(Time.valueOf("07:00:00"));
        existing.setHeureFin(Time.valueOf("09:00:00"));

        when(seanceRepo.findByAnimateurAndDate(eq("A1"), any())).thenReturn(List.of(existing));

        assertThrows(IllegalArgumentException.class, () -> service.createSeance(dto));
    }

    @Test
    void testCreateSeance_NoConflictAnimateur() {
        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(new Date());
        dto.setHeureDebut(Time.valueOf("08:00:00"));
        dto.setHeureFin(Time.valueOf("10:00:00"));

        EnseignantDTO animDto = new EnseignantDTO();
        animDto.setId("A1");
        dto.setAnimateurs(List.of(animDto));
        dto.setParticipants(Collections.emptyList());

        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(2L);
        existing.setHeureDebut(Time.valueOf("06:00:00"));
        existing.setHeureFin(Time.valueOf("07:00:00"));

        when(seanceRepo.findByAnimateurAndDate(eq("A1"), any())).thenReturn(List.of(existing));

        SeanceFormation saved = new SeanceFormation();
        saved.setIdSeance(1L);
        when(seanceRepo.save(any())).thenReturn(saved);

        SeanceDTO result = service.createSeance(dto);
        assertNotNull(result);
        assertEquals(1L, result.getIdSeance());
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
    void testUpdateSeance_Success() {
        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(1L);
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));

        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(new Date());
        dto.setHeureDebut(Time.valueOf("08:00:00"));
        dto.setHeureFin(Time.valueOf("10:00:00"));
        dto.setAnimateurs(Collections.emptyList());
        dto.setParticipants(Collections.emptyList());

        SeanceFormation saved = new SeanceFormation();
        saved.setIdSeance(1L);
        when(seanceRepo.save(any())).thenReturn(saved);

        SeanceDTO result = service.updateSeance(1L, dto);
        assertNotNull(result);
        assertEquals(1L, result.getIdSeance());
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
    void testUpdateSeance_NotFound() {
        when(seanceRepo.findById(999L)).thenReturn(Optional.empty());

        SeanceDTO dto = new SeanceDTO();
        assertThrows(RuntimeException.class, () -> service.updateSeance(999L, dto));
    }

    @Test
    void testUpdateSeance_FilterParticipants() {
        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(1L);
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));

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

        SeanceDTO result = service.updateSeance(1L, dto);
        assertEquals(1, result.getParticipants().size());
        assertEquals("P2", result.getParticipants().get(0).getId());
    }

    @Test
    void testDeleteSeance_Success() {
        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(1L);
        existing.setAnimateurs(new ArrayList<>());
        existing.setParticipants(new ArrayList<>());
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));
        when(seanceRepo.save(any())).thenReturn(existing);

        service.deleteSeance(1L);
        verify(seanceRepo).delete(existing);
    }

    @Test
    void testDeleteSeance_NotFound() {
        when(seanceRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.deleteSeance(999L));
    }

    @Test
    void testDeleteSeance_WithAnimateursAndParticipants() {
        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(1L);

        Enseignant anim = new Enseignant();
        anim.setId("A1");
        List<Enseignant> animateurs = new ArrayList<>();
        animateurs.add(anim);
        existing.setAnimateurs(animateurs);

        Enseignant part = new Enseignant();
        part.setId("P1");
        List<Enseignant> participants = new ArrayList<>();
        participants.add(part);
        existing.setParticipants(participants);

        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));
        when(seanceRepo.save(any())).thenReturn(existing);

        service.deleteSeance(1L);
        verify(seanceRepo).save(existing);
        verify(seanceRepo).delete(existing);
        assertTrue(existing.getAnimateurs().isEmpty());
        assertTrue(existing.getParticipants().isEmpty());
    }

    @Test
    void testDeleteSeance_Exception() {
        SeanceFormation existing = new SeanceFormation();
        existing.setIdSeance(1L);
        existing.setAnimateurs(new ArrayList<>());
        existing.setParticipants(new ArrayList<>());
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));
        when(seanceRepo.save(any())).thenReturn(existing);
        doThrow(new RuntimeException("Database error")).when(seanceRepo).delete(any());

        assertThrows(IllegalStateException.class, () -> service.deleteSeance(1L));
    }

    @Test
    void testMapEntityToDto_WithNullLists() {
        SeanceFormation entity = new SeanceFormation();
        entity.setIdSeance(1L);
        entity.setDateSeance(new Date());
        entity.setHeureDebut(Time.valueOf("08:00:00"));
        entity.setHeureFin(Time.valueOf("10:00:00"));
        entity.setSalle("Salle A");
        entity.setAnimateurs(null);
        entity.setParticipants(null);

        when(seanceRepo.findById(1L)).thenReturn(Optional.of(entity));

        SeanceDTO result = service.getSeanceById(1L);
        assertNotNull(result);
        assertEquals(1L, result.getIdSeance());
        // Les listes null sont converties en listes vides par le mapper
        assertNotNull(result.getAnimateurs());
        assertTrue(result.getAnimateurs().isEmpty());
        assertNotNull(result.getParticipants());
        assertTrue(result.getParticipants().isEmpty());
    }

    @Test
    void testMapDtoToEntity_WithNullLists() {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        dto.setDateSeance(new Date());
        dto.setHeureDebut(Time.valueOf("08:00:00"));
        dto.setHeureFin(Time.valueOf("10:00:00"));
        dto.setSalle("Salle A");
        dto.setAnimateurs(null);
        dto.setParticipants(null);

        SeanceFormation saved = new SeanceFormation();
        saved.setIdSeance(1L);
        when(seanceRepo.save(any())).thenReturn(saved);

        SeanceDTO result = service.createSeance(dto);
        assertNotNull(result);
        assertEquals(1L, result.getIdSeance());
    }
}
