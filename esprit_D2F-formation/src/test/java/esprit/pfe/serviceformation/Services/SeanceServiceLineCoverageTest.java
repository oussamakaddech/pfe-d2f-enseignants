package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.utils.ValidationUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.Month;
import java.time.LocalTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeanceServiceLineCoverageTest {

    @Mock private SeanceFormationRepository seanceRepo;
    @Mock private ValidationUtils validation;
    @InjectMocks private SeanceService service;

    // ==================== helpers ====================

    private Enseignant enseignant(String id) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setNom("Nom" + id);
        e.setPrenom("Prenom" + id);
        e.setMail(id + "@test.com");
        e.setType("P");
        return e;
    }

    private EnseignantDTO enseignantDto(String id) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(id);
        dto.setNom("Nom" + id);
        dto.setPrenom("Prenom" + id);
        dto.setMail(id + "@test.com");
        dto.setType("P");
        return dto;
    }

    private SeanceDTO buildDto(LocalDate date, LocalTime debut, LocalTime fin,
                               List<EnseignantDTO> anims, List<EnseignantDTO> parts) {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        dto.setDateSeance(date);
        dto.setHeureDebut(debut);
        dto.setHeureFin(fin);
        dto.setSalle("S1");
        dto.setOnlineMeetingUrl("https://teams.example.com/meet");
        dto.setAnimateurs(anims != null ? anims : Collections.emptyList());
        dto.setParticipants(parts != null ? parts : Collections.emptyList());
        return dto;
    }

    private SeanceFormation buildEntity(Long id, LocalDate date, LocalTime debut, LocalTime fin) {
        SeanceFormation s = new SeanceFormation();
        s.setIdSeance(id);
        s.setDateSeance(date);
        s.setHeureDebut(debut);
        s.setHeureFin(fin);
        s.setSalle("S1");
        s.setAnimateurs(new ArrayList<>());
        s.setParticipants(new ArrayList<>());
        return s;
    }

    // ==================== createSeance ====================

    @Test
    void createSeance_happyPath() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of(enseignantDto("P1")));

        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(Collections.emptyList());
        when(seanceRepo.findByParticipantAndDate(eq("P1"), eq(date))).thenReturn(Collections.emptyList());
        when(seanceRepo.save(any())).thenAnswer(inv -> {
            SeanceFormation s = inv.getArgument(0);
            s.setIdSeance(42L);
            return s;
        });

        SeanceDTO result = service.createSeance(dto);

        assertNotNull(result);
        assertEquals(42L, result.getIdSeance());
        verify(seanceRepo).save(any());
    }

    @Test
    void createSeance_animateurConflict_throws() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of());

        SeanceFormation conflict = buildEntity(1L, date, LocalTime.of(10, 0), LocalTime.of(12, 0));
        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(List.of(conflict));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createSeance(dto));
        assertTrue(ex.getMessage().contains("animateur id=A1"));
    }

    @Test
    void createSeance_allParticipantsFiltered() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(),
                List.of(enseignantDto("P1"), enseignantDto("P2")));

        SeanceFormation conflict = buildEntity(1L, date, LocalTime.of(9, 30), LocalTime.of(10, 30));
        when(seanceRepo.findByParticipantAndDate(eq("P1"), eq(date))).thenReturn(List.of(conflict));
        when(seanceRepo.findByParticipantAndDate(eq("P2"), eq(date))).thenReturn(List.of(conflict));
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.createSeance(dto);

        assertTrue(result.getParticipants().isEmpty());
    }

    @Test
    void createSeance_noAnimateurs_noParticipants() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = buildDto(date, debut, fin, List.of(), List.of());
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.createSeance(dto);

        assertNotNull(result);
        verify(seanceRepo).save(any());
    }

    @Test
    void createSeance_nullAnimateursAndParticipants() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(date);
        dto.setHeureDebut(debut);
        dto.setHeureFin(fin);
        dto.setSalle("S1");
        dto.setAnimateurs(null);
        dto.setParticipants(null);

        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.createSeance(dto);

        assertNotNull(result);
    }

    // ==================== getAllSeances() ====================

    @Test
    void getAllSeances_list_happyPath() {
        SeanceFormation s1 = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(seanceRepo.findAll()).thenReturn(List.of(s1));

        List<SeanceDTO> result = service.getAllSeances();

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getIdSeance());
    }

    @Test
    void getAllSeances_list_empty() {
        when(seanceRepo.findAll()).thenReturn(Collections.emptyList());

        List<SeanceDTO> result = service.getAllSeances();

        assertTrue(result.isEmpty());
    }

    @Test
    void getAllSeances_list_exception_throwsIllegalState() {
        when(seanceRepo.findAll()).thenThrow(new RuntimeException("DB error"));

        assertThrows(IllegalStateException.class, () -> service.getAllSeances());
    }

    // ==================== getAllSeances(Pageable) ====================

    @Test
    void getAllSeances_pageable_happyPath() {
        SeanceFormation s1 = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(seanceRepo.findAll(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(s1), PageRequest.of(0, 10), 1));

        var page = service.getAllSeances(PageRequest.of(0, 10));

        assertEquals(1, page.getTotalElements());
    }

    // ==================== getSeanceById ====================

    @Test
    void getSeanceById_happyPath() {
        SeanceFormation s = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(s));

        SeanceDTO result = service.getSeanceById(1L);

        assertEquals(1L, result.getIdSeance());
    }

    @Test
    void getSeanceById_notFound_throws() {
        when(seanceRepo.findById(99L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.getSeanceById(99L));
    }

    @Test
    void getSeanceById_nullId_throws() {
        assertThrows(IllegalArgumentException.class, () -> service.getSeanceById(null));
    }

    @Test
    void getSeanceById_negativeId_throws() {
        assertThrows(IllegalArgumentException.class, () -> service.getSeanceById(-1L));
    }

    // ==================== updateSeance ====================

    @Test
    void updateSeance_happyPath() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceFormation existing = buildEntity(1L, LocalDate.now(), LocalTime.of(8, 0), LocalTime.of(10, 0));
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of(enseignantDto("P1")));

        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(Collections.emptyList());
        when(seanceRepo.findByParticipantAndDate(eq("P1"), eq(date))).thenReturn(Collections.emptyList());
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.updateSeance(1L, dto);

        assertEquals(date, result.getDateSeance());
        assertEquals(debut, result.getHeureDebut());
    }

    @Test
    void updateSeance_notFound_throws() {
        when(seanceRepo.findById(99L)).thenReturn(Optional.empty());

        SeanceDTO dto = buildDto(LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0),
                List.of(), List.of());

        assertThrows(RuntimeException.class, () -> service.updateSeance(99L, dto));
    }

    @Test
    void updateSeance_animateurConflict_throws() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceFormation existing = buildEntity(1L, LocalDate.now(), LocalTime.of(8, 0), LocalTime.of(10, 0));
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of());

        SeanceFormation conflict = buildEntity(2L, date, LocalTime.of(10, 0), LocalTime.of(12, 0));
        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(List.of(conflict));

        assertThrows(IllegalArgumentException.class, () -> service.updateSeance(1L, dto));
    }

    @Test
    void updateSeance_participantsFiltered() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceFormation existing = buildEntity(1L, LocalDate.now(), LocalTime.of(8, 0), LocalTime.of(10, 0));
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(),
                List.of(enseignantDto("P1")));

        SeanceFormation conflict = buildEntity(2L, date, LocalTime.of(9, 30), LocalTime.of(10, 30));
        when(seanceRepo.findByParticipantAndDate(eq("P1"), eq(date))).thenReturn(List.of(conflict));
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.updateSeance(1L, dto);

        assertTrue(result.getParticipants().isEmpty());
    }

    // ==================== deleteSeance ====================

    @Test
    void deleteSeance_happyPath() {
        SeanceFormation s = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        s.setAnimateurs(new ArrayList<>(List.of(enseignant("A1"))));
        s.setParticipants(new ArrayList<>(List.of(enseignant("P1"))));
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(s));

        service.deleteSeance(1L);

        verify(seanceRepo).save(s);
        verify(seanceRepo).delete(s);
        assertTrue(s.getAnimateurs().isEmpty());
        assertTrue(s.getParticipants().isEmpty());
    }

    @Test
    void deleteSeance_notFound_throws() {
        when(seanceRepo.findById(99L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.deleteSeance(99L));
    }

    @Test
    void deleteSeance_nullId_throws() {
        assertThrows(IllegalArgumentException.class, () -> service.deleteSeance(null));
    }

    @Test
    void deleteSeance_negativeId_throws() {
        assertThrows(IllegalArgumentException.class, () -> service.deleteSeance(-5L));
    }

    @Test
    void deleteSeance_dbException_throwsIllegalState() {
        SeanceFormation s = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        s.setAnimateurs(new ArrayList<>());
        s.setParticipants(new ArrayList<>());
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(s));
        doThrow(new RuntimeException("DB error")).when(seanceRepo).save(any());

        assertThrows(IllegalStateException.class, () -> service.deleteSeance(1L));
    }

    @Test
    void deleteSeance_nullAnimateursAndParticipants() {
        SeanceFormation s = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        s.setAnimateurs(null);
        s.setParticipants(null);
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(s));

        service.deleteSeance(1L);

        verify(seanceRepo).save(s);
        verify(seanceRepo).delete(s);
    }

    // ==================== canSchedule edge cases via createSeance ====================

    @Test
    void canSchedule_prevNotOverlapping() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(10, 0);
        LocalTime fin = LocalTime.of(12, 0);

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of());

        // existing ends at 10:00 (not after debut=10:00) → no conflict
        SeanceFormation existing = buildEntity(1L, date, LocalTime.of(8, 0), LocalTime.of(10, 0));
        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(List.of(existing));
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.createSeance(dto);

        assertNotNull(result);
    }

    @Test
    void canSchedule_nextNotOverlapping() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(8, 0);
        LocalTime fin = LocalTime.of(10, 0);

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of());

        // existing starts at 10:00 (not before fin=10:00) → no conflict
        SeanceFormation existing = buildEntity(1L, date, LocalTime.of(10, 0), LocalTime.of(12, 0));
        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(List.of(existing));
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.createSeance(dto);

        assertNotNull(result);
    }

    @Test
    void canSchedule_ignoreSeanceId() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceFormation existing = buildEntity(1L, date, debut, fin);
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(existing));

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of());

        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(List.of(existing));
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.updateSeance(1L, dto);

        assertNotNull(result);
    }

    // ==================== mapping edge cases ====================

    @Test
    void mapEntityToDto_withUpAndDept() {
        SeanceFormation s = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        Enseignant anim = enseignant("A1");
        Up up = new Up();
        up.setId("UP1");
        up.setLibelle("UP Info");
        anim.setUp(up);
        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Dept Info");
        anim.setDept(dept);
        s.setAnimateurs(List.of(anim));
        s.setParticipants(List.of());

        when(seanceRepo.findAll()).thenReturn(List.of(s));

        List<SeanceDTO> result = service.getAllSeances();

        assertEquals(1, result.size());
        assertEquals("UP Info", result.get(0).getAnimateurs().get(0).getUpLibelle());
        assertEquals("Dept Info", result.get(0).getAnimateurs().get(0).getDeptLibelle());
    }

    @Test
    void mapEntityToDto_nullAnimateursAndParticipants() {
        SeanceFormation s = buildEntity(1L, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(11, 0));
        s.setAnimateurs(null);
        s.setParticipants(null);

        when(seanceRepo.findAll()).thenReturn(List.of(s));

        List<SeanceDTO> result = service.getAllSeances();

        assertEquals(1, result.size());
        assertNotNull(result.get(0).getAnimateurs());
        assertNotNull(result.get(0).getParticipants());
    }

    @Test
    void mapDtoToEntity_nullAnimateursAndParticipants() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = new SeanceDTO();
        dto.setDateSeance(date);
        dto.setHeureDebut(debut);
        dto.setHeureFin(fin);
        dto.setSalle("S1");
        dto.setAnimateurs(null);
        dto.setParticipants(null);

        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.createSeance(dto);

        assertNotNull(result);
    }

    // ==================== canSchedule empty calendar ====================

    @Test
    void canSchedule_emptyCalendar() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of(enseignantDto("P1")));

        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(Collections.emptyList());
        when(seanceRepo.findByParticipantAndDate(eq("P1"), eq(date))).thenReturn(Collections.emptyList());
        when(seanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeanceDTO result = service.createSeance(dto);

        assertNotNull(result);
    }

    // ==================== canSchedule direct overlap checks ====================

    @Test
    void canSchedule_prevOverlapsAndNextOverlaps() {
        LocalDate date = LocalDate.of(2025, Month.JUNE, 1);
        LocalTime debut = LocalTime.of(9, 0);
        LocalTime fin = LocalTime.of(11, 0);

        SeanceDTO dto = buildDto(date, debut, fin,
                List.of(enseignantDto("A1")),
                List.of());

        SeanceFormation existing1 = buildEntity(1L, date, LocalTime.of(7, 0), LocalTime.of(10, 0));
        SeanceFormation existing2 = buildEntity(2L, date, LocalTime.of(10, 0), LocalTime.of(12, 0));
        when(seanceRepo.findByAnimateurAndDate(eq("A1"), eq(date))).thenReturn(List.of(existing1, existing2));

        assertThrows(IllegalArgumentException.class, () -> service.createSeance(dto));
    }
}

