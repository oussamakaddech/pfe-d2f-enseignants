package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.CreateFormationRequest;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.UpdateFormationRequest;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.PeriodCode;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookEventParameters;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationServiceImpl - Tests unitaires")
class FormationServiceImplTest {

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private OutlookCalendarService outlookCalendarService;

    @InjectMocks
    private FormationServiceImpl formationService;

    private Formation formation;

    @BeforeEach
    void setUp() {
        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Spring Boot Avancé");
        formation.setDateDebut(new Date());
        formation.setDateFin(new Date());
        formation.setEtatFormation(EtatFormation.PLANIFIE);
        formation.setCoutFormation(500.0f);
        formation.setChargeHoraireGlobal(40);
        formation.setSeances(new ArrayList<>());
        formation.setFormationCompetences(new ArrayList<>());
        formation.setInscriptions(new ArrayList<>());
    }

    @Nested
    @DisplayName("createFormation()")
    class CreateFormation {

        @Test
        @DisplayName("sauvegarde et retourne la formation")
        void shouldCreateFormation() {
            CreateFormationRequest request = new CreateFormationRequest();
            request.setTitreFormation("Spring Boot Avancé");
            request.setDateDebut(LocalDate.now());
            request.setDateFin(LocalDate.now().plusDays(5));
            request.setTypeFormation("INTERNE");
            request.setEtatFormation("PLANIFIEE");
            request.setChargeHoraireGlobal(40);
            request.setCoutFormation(500.0f);

            when(formationRepository.save(any(Formation.class))).thenReturn(formation);

            FormationResponseDTO result = formationService.createFormation(request);

            assertThat(result).isNotNull();
            assertThat(result.getIdFormation()).isEqualTo(1L);
            assertThat(result.getTitreFormation()).isEqualTo("Spring Boot Avancé");
            verify(formationRepository, times(1)).save(any());
        }
    }

    @Nested
    @DisplayName("updateFormation()")
    class UpdateFormation {

        @Test
        @DisplayName("met à jour une formation existante")
        void shouldUpdateFormation() {
            UpdateFormationRequest updateRequest = new UpdateFormationRequest();
            updateRequest.setTitreFormation("Spring Boot Avancé - V2");
            updateRequest.setEtatFormation("EN_COURS");
            updateRequest.setCoutFormation(750.0f);
            updateRequest.setChargeHoraireGlobal(60);
            updateRequest.setDateDebut(LocalDate.now());
            updateRequest.setDateFin(LocalDate.now().plusDays(5));

            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
            when(formationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            FormationResponseDTO result = formationService.updateFormation(1L, updateRequest);

            assertThat(result.getTitreFormation()).isEqualTo("Spring Boot Avancé - V2");
            assertThat(result.getEtatFormation()).isEqualTo("EN_COURS");
            assertThat(result.getCoutFormation()).isEqualTo(750.0f);
            verify(formationRepository).findById(1L);
            verify(formationRepository).save(any());
        }

        @Test
        @DisplayName("lève IllegalArgumentException si formation introuvable")
        void shouldThrowWhenNotFound() {
            UpdateFormationRequest updateRequest = new UpdateFormationRequest();
            updateRequest.setTitreFormation("Test");
            updateRequest.setDateDebut(LocalDate.now());
            updateRequest.setDateFin(LocalDate.now().plusDays(5));

            when(formationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.updateFormation(999L, updateRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    @Nested
    @DisplayName("deleteFormation()")
    class DeleteFormation {

        @Test
        @DisplayName("supprime par id")
        void shouldDeleteById() {
            when(formationRepository.existsById(1L)).thenReturn(true);
            doNothing().when(formationRepository).deleteById(1L);

            formationService.deleteFormation(1L);

            verify(formationRepository).deleteById(1L);
        }

        @Test
        @DisplayName("lève IllegalArgumentException si introuvable")
        void shouldThrowWhenDeleteNotFound() {
            when(formationRepository.existsById(999L)).thenReturn(false);

            assertThatThrownBy(() -> formationService.deleteFormation(999L))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("getFormationById()")
    class GetById {

        @Test
        @DisplayName("retourne la formation")
        void shouldReturnFormation() {
            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));

            FormationResponseDTO result = formationService.getFormationById(1L);

            assertThat(result).isNotNull();
            assertThat(result.getTitreFormation()).isEqualTo("Spring Boot Avancé");
            verify(formationRepository).findById(1L);
        }

        @Test
        @DisplayName("lève IllegalArgumentException si introuvable")
        void shouldThrowWhenNotFound() {
            when(formationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.getFormationById(999L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    @Nested
    @DisplayName("getAllFormations()")
    class GetAll {

        @Test
        @DisplayName("retourne toutes les formations")
        void shouldReturnAll() {
            Formation f2 = new Formation();
            f2.setIdFormation(2L);
            f2.setTitreFormation("Docker Masterclass");
            f2.setSeances(new ArrayList<>());
            f2.setFormationCompetences(new ArrayList<>());
            f2.setInscriptions(new ArrayList<>());

            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(formation, f2)));

            Page<esprit.pfe.serviceformation.dto.FormationResponseDTO> result = formationService.getAllFormations(Pageable.unpaged());

            assertThat(result).hasSize(2);
            verify(formationRepository).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("retourne une liste vide")
        void shouldReturnEmptyList() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));

            Page<esprit.pfe.serviceformation.dto.FormationResponseDTO> result = formationService.getAllFormations(Pageable.unpaged());

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("createFormation() with Outlook Calendar")
    class CreateWithOutlook {

        @Test
        @DisplayName("cree evenement Outlook quand service disponible et eventId non null")
        void shouldCreateOutlookEvent() {
            CreateFormationRequest request = new CreateFormationRequest();
            request.setTitreFormation("Spring Boot Avancé");
            request.setDateDebut(LocalDate.now());
            request.setDateFin(LocalDate.now().plusDays(5));
            request.setTypeFormation("INTERNE");
            request.setEtatFormation("PLANIFIEE");
            request.setChargeHoraireGlobal(40);

            when(formationRepository.save(any(Formation.class))).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                if (f.getIdFormation() == null) f.setIdFormation(1L);
                return f;
            });
            when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any(OutlookEventParameters.class)))
                    .thenReturn(new OutlookCalendarService.EventCreationResult("evt-123", null));

            FormationResponseDTO result = formationService.createFormation(request);

            assertThat(result).isNotNull();
            verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
            verify(formationRepository, atLeast(2)).save(any());
        }

        @Test
        @DisplayName("ne cree pas evenement Outlook quand service retourne eventId null")
        void shouldNotSaveWhenEventIdNull() {
            CreateFormationRequest request = new CreateFormationRequest();
            request.setTitreFormation("Spring Boot Avancé");
            request.setDateDebut(LocalDate.now());
            request.setDateFin(LocalDate.now().plusDays(5));
            request.setTypeFormation("INTERNE");
            request.setEtatFormation("PLANIFIEE");
            request.setChargeHoraireGlobal(40);

            when(formationRepository.save(any(Formation.class))).thenReturn(formation);
            when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any(OutlookEventParameters.class)))
                    .thenReturn(new OutlookCalendarService.EventCreationResult(null, null));

            FormationResponseDTO result = formationService.createFormation(request);

            assertThat(result).isNotNull();
            verify(formationRepository, times(1)).save(any());
        }

        @Test
        @DisplayName("continue sans Outlook quand exception levee")
        void shouldContinueWhenOutlookFails() {
            CreateFormationRequest request = new CreateFormationRequest();
            request.setTitreFormation("Spring Boot Avancé");
            request.setDateDebut(LocalDate.now());
            request.setDateFin(LocalDate.now().plusDays(5));
            request.setTypeFormation("INTERNE");
            request.setEtatFormation("PLANIFIEE");
            request.setChargeHoraireGlobal(40);

            when(formationRepository.save(any(Formation.class))).thenReturn(formation);
            when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any(OutlookEventParameters.class)))
                    .thenThrow(new RuntimeException("Outlook unavailable"));

            FormationResponseDTO result = formationService.createFormation(request);

            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("updateFormation() extended")
    class UpdateExtended {

        @Test
        @DisplayName("met a jour typeFormation et periodCode")
        void shouldUpdateTypeAndPeriod() {
            UpdateFormationRequest updateRequest = new UpdateFormationRequest();
            updateRequest.setTitreFormation("Updated");
            updateRequest.setTypeFormation("INTERNE");
            updateRequest.setDateDebut(LocalDate.now());
            updateRequest.setDateFin(LocalDate.now().plusDays(5));
            updateRequest.setPeriodCode("P1");

            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
            when(formationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            FormationResponseDTO result = formationService.updateFormation(1L, updateRequest);

            assertThat(result).isNotNull();
        }
    }
}
