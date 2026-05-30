package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.exception.FormationStateException;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Time;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Couverture ciblée - petits services")
class CoverageBoostTest {

    // ── FormationStateMachine ──
    private final FormationStateMachine sm = new FormationStateMachine();

    @Test @DisplayName("SM: toutes les transitions valides")
    void testAllValidTransitions() {
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.NOUVEAU, EtatFormation.ENREGISTRE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.NOUVEAU, EtatFormation.PLANIFIE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.NOUVEAU, EtatFormation.ANNULE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.ENREGISTRE, EtatFormation.PLANIFIE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.ENREGISTRE, EtatFormation.ANNULE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.PLANIFIE, EtatFormation.EN_COURS));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.PLANIFIE, EtatFormation.ANNULE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.EN_COURS, EtatFormation.ACHEVE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.EN_COURS, EtatFormation.ANNULE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.VISIBLE, EtatFormation.PLANIFIE));
        assertDoesNotThrow(() -> sm.validateTransition(EtatFormation.VISIBLE, EtatFormation.ANNULE));
    }

    @Test @DisplayName("SM: transitions invalides")
    void testAllInvalidTransitions() {
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.PLANIFIE, EtatFormation.ACHEVE));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.EN_COURS, EtatFormation.PLANIFIE));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.ACHEVE, EtatFormation.ENREGISTRE));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.ANNULE, EtatFormation.PLANIFIE));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.VISIBLE, EtatFormation.EN_COURS));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.VISIBLE, EtatFormation.ACHEVE));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.NOUVEAU, EtatFormation.EN_COURS));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.NOUVEAU, EtatFormation.ACHEVE));
    }

    @Test @DisplayName("SM: null states")
    void testNullStates() {
        assertFalse(sm.canTransition(null, EtatFormation.PLANIFIE));
        assertFalse(sm.canTransition(EtatFormation.PLANIFIE, null));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(null, EtatFormation.PLANIFIE));
        assertThrows(FormationStateException.class, () -> sm.validateTransition(EtatFormation.PLANIFIE, null));
    }

    @Test @DisplayName("SM: canDelete et isTerminalState")
    void testCanDeleteAndTerminal() {
        assertTrue(sm.canDelete(EtatFormation.NOUVEAU));
        assertTrue(sm.canDelete(EtatFormation.ANNULE));
        assertFalse(sm.canDelete(EtatFormation.VISIBLE));
        assertFalse(sm.canDelete(EtatFormation.PLANIFIE));
        assertFalse(sm.canDelete(EtatFormation.EN_COURS));
        assertFalse(sm.canDelete(EtatFormation.ACHEVE));
        assertFalse(sm.canDelete(EtatFormation.ENREGISTRE));
        assertTrue(sm.isTerminalState(EtatFormation.ACHEVE));
        assertTrue(sm.isTerminalState(EtatFormation.ANNULE));
        assertFalse(sm.isTerminalState(EtatFormation.PLANIFIE));
        assertFalse(sm.isTerminalState(EtatFormation.ENREGISTRE));
        assertFalse(sm.isTerminalState(EtatFormation.VISIBLE));
        assertFalse(sm.isTerminalState(EtatFormation.NOUVEAU));
    }

    // ── FormationReminderScheduler ──
    @Mock private SeanceFormationRepository seanceRepo;
    @Mock private OutlookMailService mailService;
    @InjectMocks private FormationReminderScheduler scheduler;

    @Test @DisplayName("Scheduler: null mailService")
    void testSchedulerNullMail() {
        FormationReminderScheduler noMail = new FormationReminderScheduler(seanceRepo, null);
        noMail.sendDailyReminders();
        verifyNoInteractions(seanceRepo);
    }

    @Test @DisplayName("Scheduler: pas de séances")
    void testSchedulerNoSeances() {
        when(seanceRepo.findByDateSeance(any())).thenReturn(new ArrayList<>());
        scheduler.sendDailyReminders();
        verify(mailService, never()).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: seance J-1 avec email")
    void testSchedulerWithSeance() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(EtatFormation.PLANIFIE);
        f.setExterneFormateurEmail("ext@test.tn");

        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(1)));
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());

        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(1)))).thenReturn(List.of(sf));
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(7)))).thenReturn(new ArrayList<>());
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(3)))).thenReturn(new ArrayList<>());

        scheduler.sendDailyReminders();
        verify(mailService, atLeastOnce()).sendMail(eq("ext@test.tn"), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: seance avec animateurs et participants")
    void testSchedulerWithAnimateurs() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(EtatFormation.PLANIFIE);

        Enseignant anim = new Enseignant();
        anim.setMail("anim@esprit.tn");
        Enseignant part = new Enseignant();
        part.setMail("part@esprit.tn");

        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(3)));
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setAnimateurs(new ArrayList<>(List.of(anim)));
        sf.setParticipants(new ArrayList<>(List.of(part)));

        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(3)))).thenReturn(List.of(sf));
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(7)))).thenReturn(new ArrayList<>());
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(1)))).thenReturn(new ArrayList<>());

        scheduler.sendDailyReminders();
        verify(mailService, atLeast(2)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: seance sans salle")
    void testSchedulerNoSalle() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(EtatFormation.PLANIFIE);

        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(1)));
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setSalle(null);
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        f.setExterneFormateurEmail("ext@t.tn");

        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(1)))).thenReturn(List.of(sf));
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(7)))).thenReturn(new ArrayList<>());
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(3)))).thenReturn(new ArrayList<>());

        scheduler.sendDailyReminders();
        verify(mailService, atLeastOnce()).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: seance formation non PLANIFIE")
    void testSchedulerNonPlanifiee() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(EtatFormation.EN_COURS);

        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(1)));
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));

        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(1)))).thenReturn(List.of(sf));
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(7)))).thenReturn(new ArrayList<>());
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(3)))).thenReturn(new ArrayList<>());

        scheduler.sendDailyReminders();
        verify(mailService, never()).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: sendRemindersForFormation")
    void testSendRemindersForFormation() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(EtatFormation.PLANIFIE);
        f.setExterneFormateurEmail("ext@t.tn");

        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(3)));
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());

        when(seanceRepo.findByFormation_IdFormation(1L)).thenReturn(List.of(sf));
        scheduler.sendRemindersForFormation(1L, 3);
        verify(mailService, atLeastOnce()).sendMail(eq("ext@t.tn"), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: sendRemindersForFormation sans correspondance")
    void testSendRemindersNoMatch() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(EtatFormation.PLANIFIE);

        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(5)));

        when(seanceRepo.findByFormation_IdFormation(1L)).thenReturn(List.of(sf));
        scheduler.sendRemindersForFormation(1L, 3);
        verify(mailService, never()).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: sendRemindersForFormation formation non planifiee")
    void testSendRemindersNonPlanifiee() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setEtatFormation(EtatFormation.ANNULE);

        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(1)));

        when(seanceRepo.findByFormation_IdFormation(1L)).thenReturn(List.of(sf));
        scheduler.sendRemindersForFormation(1L, 1);
        verify(mailService, never()).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("Scheduler: email échoue")
    void testSchedulerEmailFails() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Africa/Tunis"));
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(EtatFormation.PLANIFIE);
        f.setExterneFormateurEmail("ext@t.tn");

        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setFormation(f);
        sf.setDateSeance(java.sql.Date.valueOf(today.plusDays(1)));
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());

        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(1)))).thenReturn(List.of(sf));
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(7)))).thenReturn(new ArrayList<>());
        when(seanceRepo.findByDateSeance(java.sql.Date.valueOf(today.plusDays(3)))).thenReturn(new ArrayList<>());
        doThrow(new RuntimeException("fail")).when(mailService).sendMail(anyString(), anyString(), anyString());

        assertDoesNotThrow(() -> scheduler.sendDailyReminders());
    }

    // ── CreateFormationRequest ──
    @Test @DisplayName("Request: date validation")
    void testDateValidation() {
        CreateFormationRequest req = new CreateFormationRequest();
        req.setDateDebut(null);
        req.setDateFin(null);
        assertTrue(req.isDateRangeValid());

        req.setDateDebut(LocalDate.of(2026, 1, 1));
        req.setDateFin(LocalDate.of(2026, 1, 10));
        assertTrue(req.isDateRangeValid());

        req.setDateDebut(LocalDate.of(2026, 1, 10));
        req.setDateFin(LocalDate.of(2026, 1, 1));
        assertFalse(req.isDateRangeValid());
    }
}
