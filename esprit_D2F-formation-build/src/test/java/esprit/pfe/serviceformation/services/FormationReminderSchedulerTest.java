package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationReminderScheduler - Tests unitaires")
class FormationReminderSchedulerTest {

    @Mock
    private SeanceFormationRepository seanceFormationRepository;

    @Mock
    private OutlookMailService outlookMailService;

    @InjectMocks
    private FormationReminderScheduler scheduler;

    private SeanceFormation seance;
    private Formation formation;

    @BeforeEach
    void setUp() {
        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Formation Test");
        formation.setEtatFormation(EtatFormation.PLANIFIE);
        formation.setExterneFormateurEmail("externe@test.tn");

        seance = new SeanceFormation();
        seance.setIdSeance(10L);
        seance.setFormation(formation);
        seance.setDateSeance(Date.valueOf(LocalDate.now(ZoneId.of("Africa/Tunis")).plusDays(1)));
        seance.setHeureDebut(Time.valueOf("09:00:00"));
        seance.setHeureFin(Time.valueOf("11:00:00"));
        seance.setAnimateurs(new ArrayList<>());
        seance.setParticipants(new ArrayList<>());
    }

    @Test
    @DisplayName("sendDailyReminders - Succès pour J-1")
    void shouldSendDailyReminders() {
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Tunis"));
        
        // Mocking for J-7, J-3, J-1
        when(seanceFormationRepository.findByDateSeance(any())).thenReturn(new ArrayList<>());
        when(seanceFormationRepository.findByDateSeance(Date.valueOf(today.plusDays(1))))
                .thenReturn(List.of(seance));

        scheduler.sendDailyReminders();

        verify(outlookMailService, atLeastOnce()).sendMail(eq("externe@test.tn"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendRemindersForFormation - Succès")
    void shouldSendRemindersForFormation() {
        when(seanceFormationRepository.findByFormation_IdFormation(1L)).thenReturn(List.of(seance));

        scheduler.sendRemindersForFormation(1L, 1);

        verify(outlookMailService, atLeastOnce()).sendMail(eq("externe@test.tn"), anyString(), anyString());
    }
}
