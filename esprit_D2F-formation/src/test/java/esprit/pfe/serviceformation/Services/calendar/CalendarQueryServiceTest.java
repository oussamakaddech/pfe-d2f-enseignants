package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.common.PageResponse;
import esprit.pfe.serviceformation.dto.calendar.CalendarFormationDTO;
import esprit.pfe.serviceformation.dto.calendar.CalendarParticipantDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationParticipantEmail;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalendarQueryServiceTest {

    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceRepository;
    @Mock private FormationParticipantEmailRepository participantEmailRepository;
    @InjectMocks private CalendarQueryService service;

    private Formation formation() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Java Spring");
        f.setEtatFormation(EtatFormation.PLANIFIE);
        f.setSalle("Salle A");
        f.setResponsableName("Prof. Test");
        f.setDateDebut(LocalDate.now());
        f.setDateFin(LocalDate.now());
        return f;
    }

    @Test
    void listFormationsReturnsPage() {
        Page<Formation> page = new PageImpl<>(List.of(formation()), PageRequest.of(0, 10), 1);
        when(formationRepository.findCalendarFormations(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<CalendarFormationDTO> result = service.listFormations(null, null, PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitre()).isEqualTo("Java Spring");
    }

    @Test
    void listFormationsWithEtatFilter() {
        Page<Formation> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(formationRepository.findCalendarFormations(isNull(), eq(EtatFormation.PLANIFIE), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<CalendarFormationDTO> result = service.listFormations(null, "PLANIFIE", PageRequest.of(0, 10));
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void listFormationsWithInvalidEtatThrows() {
        Pageable pageable = PageRequest.of(0, 10);
        assertThatThrownBy(() -> service.listFormations(null, "INVALID", pageable))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inconnu");
    }

    @Test
    void listFormationsBlankTitleConvertedToNull() {
        Page<Formation> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(formationRepository.findCalendarFormations(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<CalendarFormationDTO> result = service.listFormations("  ", null, PageRequest.of(0, 10));
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getFormationReturnsDTO() {
        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation()));
        when(seanceRepository.countByFormation_IdFormation(1L)).thenReturn(3L);
        when(participantEmailRepository.countByFormationId(1L)).thenReturn(15L);

        CalendarFormationDTO dto = service.getFormation(1L);
        assertThat(dto.getTitre()).isEqualTo("Java Spring");
        assertThat(dto.getSessionsCount()).isEqualTo(3);
        assertThat(dto.getParticipantsCount()).isEqualTo(15);
    }

    @Test
    void getFormationThrowsWhenMissing() {
        when(formationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getFormation(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getParticipantsReturnsPage() {
        when(formationRepository.existsById(1L)).thenReturn(true);
        FormationParticipantEmail p = new FormationParticipantEmail();
        p.setEmail("test@esprit.tn");
        p.setMatchedEnseignant(true);
        Page<FormationParticipantEmail> page = new PageImpl<>(List.of(p), PageRequest.of(0, 50), 1);
        when(participantEmailRepository.findByFormationId(eq(1L), any(Pageable.class))).thenReturn(page);

        PageResponse<CalendarParticipantDTO> result = service.getParticipants(1L, PageRequest.of(0, 50));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmail()).isEqualTo("test@esprit.tn");
    }

    @Test
    void getParticipantsThrowsWhenFormationMissing() {
        when(formationRepository.existsById(99L)).thenReturn(false);
        Pageable pageable = PageRequest.of(0, 50);
        assertThatThrownBy(() -> service.getParticipants(99L, pageable))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
