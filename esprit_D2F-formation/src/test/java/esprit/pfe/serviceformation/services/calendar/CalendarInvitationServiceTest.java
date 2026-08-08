package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.dto.calendar.SendInvitationsResultDTO;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.services.CalendarExportService;
import esprit.pfe.serviceformation.utils.IcsCalendarWriter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CalendarInvitationServiceTest {

    @Mock private CalendarExportService exportService;
    @Mock private IcsCalendarWriter icsWriter;
    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceRepository;
    @Mock private FormationParticipantEmailRepository participantEmailRepository;
    @Mock private CalendarMailSender mailSender;
    @InjectMocks private CalendarInvitationService service;

    private Formation formation() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test Formation");
        return f;
    }

    @Test
    void sendForFormationReturnsNoRecipientWhenEmpty() {
        when(formationRepository.findById(1L)).thenReturn(java.util.Optional.of(formation()));
        when(participantEmailRepository.findDistinctEmailsByFormationId(1L)).thenReturn(Collections.emptyList());
        when(seanceRepository.findDistinctParticipantMailsByFormation(1L)).thenReturn(Collections.emptyList());

        SendInvitationsResultDTO result = service.sendForFormation(1L);
        assertThat(result.getStatus()).isEqualTo("NO_RECIPIENT");
    }

    @Test
    void sendForFormationThrowsWhenFormationNotFound() {
        when(formationRepository.findById(99L)).thenReturn(java.util.Optional.empty());
        assertThatThrownBy(() -> service.sendForFormation(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void sendForFormationDispatchesToRecipients() {
        when(formationRepository.findById(1L)).thenReturn(java.util.Optional.of(formation()));
        when(participantEmailRepository.findDistinctEmailsByFormationId(1L))
                .thenReturn(List.of("a@test.com"));
        when(seanceRepository.findDistinctParticipantMailsByFormation(1L))
                .thenReturn(Collections.emptyList());
        when(exportService.buildEventsForFormation(eq(1L), anyList())).thenReturn(List.of());
        when(icsWriter.buildRequestCalendar(anyList())).thenReturn("BEGIN:VCALENDAR");

        SendInvitationsResultDTO result = service.sendForFormation(1L);
        assertThat(result.getStatus()).isEqualTo("DISPATCHED");
        assertThat(result.getRecipientsDispatched()).isEqualTo(1);
        verify(mailSender).sendInvitation(eq(1L), eq("a@test.com"), any(), anyString(), anyString());
    }

    @Test
    void sendForAllIteratesFormations() {
        when(seanceRepository.findDistinctFormationIds()).thenReturn(List.of(1L, 2L));
        when(formationRepository.findById(1L)).thenReturn(java.util.Optional.of(formation()));
        when(formationRepository.findById(2L)).thenReturn(java.util.Optional.of(formation()));
        when(participantEmailRepository.findDistinctEmailsByFormationId(anyLong()))
                .thenReturn(List.of("a@test.com"));
        when(seanceRepository.findDistinctParticipantMailsByFormation(anyLong()))
                .thenReturn(Collections.emptyList());
        when(exportService.buildEventsForFormation(anyLong(), anyList())).thenReturn(List.of());
        when(icsWriter.buildRequestCalendar(anyList())).thenReturn("BEGIN:VCALENDAR");

        SendInvitationsResultDTO result = service.sendForAll();
        assertThat(result.getFormationsProcessed()).isEqualTo(2);
        assertThat(result.getRecipientsDispatched()).isEqualTo(2);
    }

    @Test
    void sendForAllSkipsFormationsWithNoRecipients() {
        when(seanceRepository.findDistinctFormationIds()).thenReturn(List.of(1L));
        when(formationRepository.findById(1L)).thenReturn(java.util.Optional.of(formation()));
        when(participantEmailRepository.findDistinctEmailsByFormationId(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.findDistinctParticipantMailsByFormation(1L))
                .thenReturn(Collections.emptyList());

        SendInvitationsResultDTO result = service.sendForAll();
        assertThat(result.getFormationsProcessed()).isZero();
    }
}
