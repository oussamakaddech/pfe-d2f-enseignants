package esprit.pfe.serviceformation.services.animator;

import esprit.pfe.serviceformation.dto.calendar.IcsEvent;
import esprit.pfe.serviceformation.entities.AnimateurExterne;
import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.AssignmentStatus;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationAnimator;
import esprit.pfe.serviceformation.entities.FormationAnimatorProposal;
import esprit.pfe.serviceformation.messaging.AnimatorProposalEventPublisher;
import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationAnimatorProposalRepository;
import esprit.pfe.serviceformation.services.CalendarExportService;
import esprit.pfe.serviceformation.services.calendar.CalendarMailSender;
import esprit.pfe.serviceformation.utils.IcsCalendarWriter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests de l'idempotence des invitations calendrier des animateurs.
 */
@ExtendWith(MockitoExtension.class)
class AnimatorCalendarServiceTest {

    @Mock private FormationAnimatorProposalRepository proposalRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private AnimateurExterneRepository animateurExterneRepository;
    @Mock private CalendarExportService exportService;
    @Mock private IcsCalendarWriter icsWriter;
    @Mock private CalendarMailSender mailSender;
    @Mock private AnimatorProposalEventPublisher eventPublisher;

    @InjectMocks
    private AnimatorCalendarService service;

    private Formation formation() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Machine Learning");
        return f;
    }

    private FormationAnimator assignment() {
        return FormationAnimator.builder()
                .id(7L)
                .formationId(1L)
                .teacherId("E00001")
                .role(AnimatorRole.LEAD_TRAINER)
                .assignedBy("chef-user")
                .status(AssignmentStatus.ACTIVE)
                .build();
    }

    private FormationAnimatorProposal proposalWithoutEvent() {
        return FormationAnimatorProposal.builder()
                .id(10L)
                .formationId(1L)
                .proposerId("E00001")
                .role(AnimatorRole.LEAD_TRAINER)
                .build();
    }

    @Test
    void test_invitation_sent_once_then_persisted() {
        Formation f = formation();
        FormationAnimator assignment = assignment();
        FormationAnimatorProposal proposal = proposalWithoutEvent();
        when(enseignantRepository.findById("E00001")).thenReturn(Optional.of(new Enseignant()));
        ((Enseignant) enseignantRepository.findById("E00001").orElseThrow()).setMail("anim@esprit.tn");
        when(exportService.buildEventsForFormation(eq(1L), anyList())).thenReturn(List.of());
        when(icsWriter.buildRequestCalendar(anyList())).thenReturn("BEGIN:VCALENDAR...");
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.onAnimatorConfirmed(f, assignment, proposal);

        // L'invitation est envoyée une fois, l'eventId est persisté.
        verify(mailSender, times(1)).sendInvitation(eq(1L), eq("anim@esprit.tn"), any(), anyString(), anyString());
        verify(proposalRepository).save(any(FormationAnimatorProposal.class));
        verify(eventPublisher).publishCalendarInvitationRequested(any());
    }

    @Test
    void test_duplicate_calendar_event_is_not_sent() {
        Formation f = formation();
        FormationAnimator assignment = assignment();
        // Le proposal a DÉJÀ reçu l'invitation (eventId persisté).
        FormationAnimatorProposal proposal = proposalWithoutEvent();
        proposal.setCalendarEventId("animator-invite:1:E00001:LEAD_TRAINER");

        service.onAnimatorConfirmed(f, assignment, proposal);

        // Aucun doublon : ni envoi, ni republication d'événement.
        verify(mailSender, never()).sendInvitation(any(), anyString(), any(), anyString(), anyString());
        verify(eventPublisher, never()).publishCalendarInvitationRequested(any());
        verify(proposalRepository, never()).save(any(FormationAnimatorProposal.class));
    }

    @Test
    void test_no_email_no_send() {
        Formation f = formation();
        FormationAnimator assignment = assignment();
        FormationAnimatorProposal proposal = proposalWithoutEvent();
        // Enseignant sans e-mail résolvable.
        when(enseignantRepository.findById("E00001")).thenReturn(Optional.empty());

        service.onAnimatorConfirmed(f, assignment, proposal);

        // Pas d'envoi mais l'eventId est quand même consommé (idempotence).
        verify(mailSender, never()).sendInvitation(any(), anyString(), any(), anyString(), anyString());
        verify(proposalRepository).save(any(FormationAnimatorProposal.class));
    }

    @Test
    void test_external_trainer_invitation() {
        Formation f = formation();
        FormationAnimator assignment = FormationAnimator.builder()
                .id(8L)
                .formationId(1L)
                .animateurId("42")
                .role(AnimatorRole.FACILITATOR)
                .assignedBy("admin-user")
                .status(AssignmentStatus.ACTIVE)
                .build();
        FormationAnimatorProposal proposal = proposalWithoutEvent();
        AnimateurExterne externe = new AnimateurExterne();
        externe.setEmail("externe@bureau.tn");
        when(animateurExterneRepository.findById(42L)).thenReturn(Optional.of(externe));
        when(exportService.buildEventsForFormation(eq(1L), anyList())).thenReturn(List.of());
        when(icsWriter.buildRequestCalendar(anyList())).thenReturn("ICS");
        when(proposalRepository.save(any(FormationAnimatorProposal.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.onAnimatorConfirmed(f, assignment, proposal);

        verify(mailSender, times(1)).sendInvitation(eq(1L), eq("externe@bureau.tn"), any(), anyString(), anyString());
    }
}
