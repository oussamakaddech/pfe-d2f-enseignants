package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.CreateFormationRequest;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.UpdateFormationRequest;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
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

    @Mock
    private FormationMapper formationMapper;

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

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Spring Boot Avancé");

            when(formationMapper.toEntity(any(CreateFormationRequest.class))).thenReturn(formation);
            when(formationRepository.save(any(Formation.class))).thenReturn(formation);
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

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

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Spring Boot Avancé - V2");
            dto.setEtatFormation("EN_COURS");
            dto.setCoutFormation(750.0f);

            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
            when(formationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            doAnswer(inv -> { formation.setTitreFormation("Spring Boot Avancé - V2"); formation.setCoutFormation(750.0f); return null; })
                .when(formationMapper).updateEntityFromRequest(any(UpdateFormationRequest.class), any(Formation.class));
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

            FormationResponseDTO result = formationService.updateFormation(1L, updateRequest);

            assertThat(result.getTitreFormation()).isEqualTo("Spring Boot Avancé - V2");
            assertThat(result.getEtatFormation()).isEqualTo("EN_COURS");
            assertThat(result.getCoutFormation()).isEqualTo(750.0f);
            verify(formationRepository).findById(1L);
            verify(formationRepository).save(any());
        }

        @Test
        @DisplayName("lève ResourceNotFoundException si formation introuvable")
        void shouldThrowWhenNotFound() {
            UpdateFormationRequest updateRequest = new UpdateFormationRequest();
            updateRequest.setTitreFormation("Test");
            updateRequest.setDateDebut(LocalDate.now());
            updateRequest.setDateFin(LocalDate.now().plusDays(5));

            when(formationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.updateFormation(999L, updateRequest))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    @Nested
    @DisplayName("deleteFormation()")
    class DeleteFormation {

        @Test
        @DisplayName("supprime par id")
        void shouldDeleteById() {
            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
            doNothing().when(formationRepository).deleteById(1L);

            formationService.deleteFormation(1L);

            verify(formationRepository).deleteById(1L);
        }

        @Test
        @DisplayName("lève ResourceNotFoundException si introuvable")
        void shouldThrowWhenDeleteNotFound() {
            when(formationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.deleteFormation(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getFormationById()")
    class GetById {

        @Test
        @DisplayName("retourne la formation")
        void shouldReturnFormation() {
            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Spring Boot Avancé");

            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
            when(formationMapper.toResponseDTO(formation)).thenReturn(dto);

            FormationResponseDTO result = formationService.getFormationById(1L);

            assertThat(result).isNotNull();
            assertThat(result.getTitreFormation()).isEqualTo("Spring Boot Avancé");
            verify(formationRepository).findById(1L);
        }

        @Test
        @DisplayName("lève ResourceNotFoundException si introuvable")
        void shouldThrowWhenNotFound() {
            when(formationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.getFormationById(999L))
                    .isInstanceOf(ResourceNotFoundException.class)
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

            FormationResponseDTO dto1 = new FormationResponseDTO();
            dto1.setIdFormation(1L);
            dto1.setTitreFormation("Spring Boot Avancé");
            FormationResponseDTO dto2 = new FormationResponseDTO();
            dto2.setIdFormation(2L);
            dto2.setTitreFormation("Docker Masterclass");

            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(formation, f2)));
            when(formationMapper.toResponseDTO(formation)).thenReturn(dto1);
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);

            Page<FormationResponseDTO> result = formationService.getAllFormations(Pageable.unpaged());

            assertThat(result).hasSize(2);
            verify(formationRepository).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("retourne une liste vide")
        void shouldReturnEmptyList() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));

            Page<FormationResponseDTO> result = formationService.getAllFormations(Pageable.unpaged());

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

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Spring Boot Avancé");

            when(formationMapper.toEntity(any(CreateFormationRequest.class))).thenReturn(formation);
            when(formationRepository.save(any(Formation.class))).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                if (f.getIdFormation() == null) f.setIdFormation(1L);
                return f;
            });
            when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any(OutlookEventParameters.class)))
                    .thenReturn(new OutlookCalendarService.EventCreationResult("evt-123", null));
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

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

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Spring Boot Avancé");

            when(formationMapper.toEntity(any(CreateFormationRequest.class))).thenReturn(formation);
            when(formationRepository.save(any(Formation.class))).thenReturn(formation);
            when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any(OutlookEventParameters.class)))
                    .thenReturn(new OutlookCalendarService.EventCreationResult(null, null));
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

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

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Spring Boot Avancé");

            when(formationMapper.toEntity(any(CreateFormationRequest.class))).thenReturn(formation);
            when(formationRepository.save(any(Formation.class))).thenReturn(formation);
            when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any(OutlookEventParameters.class)))
                    .thenThrow(new RuntimeException("Outlook unavailable"));
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

            FormationResponseDTO result = formationService.createFormation(request);

            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("createFormation() without Outlook")
    class CreateWithoutOutlook {

        @Test
        @DisplayName("cree formation sans Outlook quand service est null")
        void shouldCreateWithoutOutlookWhenServiceNull() {
            FormationServiceImpl serviceNoOutlook = new FormationServiceImpl(formationRepository, formationMapper, null);

            CreateFormationRequest request = new CreateFormationRequest();
            request.setTitreFormation("Test");
            request.setDateDebut(LocalDate.now());
            request.setDateFin(LocalDate.now().plusDays(5));
            request.setTypeFormation("INTERNE");
            request.setEtatFormation("PLANIFIEE");

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Test");

            when(formationMapper.toEntity(any(CreateFormationRequest.class))).thenReturn(formation);
            when(formationRepository.save(any(Formation.class))).thenReturn(formation);
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

            FormationResponseDTO result = serviceNoOutlook.createFormation(request);

            assertThat(result).isNotNull();
            assertThat(result.getTitreFormation()).isEqualTo("Test");
            verify(formationRepository, times(1)).save(any());
        }
    }

    @Nested
    @DisplayName("recoverDeletedFormation()")
    class RecoverDeleted {

        @Test
        @DisplayName("recupere une formation supprimee")
        void shouldRecoverDeleted() {
            formation.setDeletedAt(java.time.LocalDateTime.now());
            when(formationRepository.findDeletedById(1L)).thenReturn(formation);
            when(formationRepository.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Spring Boot Avancé");
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

            FormationResponseDTO result = formationService.recoverDeletedFormation(1L);

            assertThat(result).isNotNull();
            assertThat(formation.getDeletedAt()).isNull();
            verify(formationRepository).findDeletedById(1L);
            verify(formationRepository).save(formation);
        }

        @Test
        @DisplayName("leve ResourceNotFoundException si formation supprimee introuvable")
        void shouldThrowWhenNotFound() {
            when(formationRepository.findDeletedById(999L)).thenReturn(null);

            assertThatThrownBy(() -> formationService.recoverDeletedFormation(999L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    @Nested
    @DisplayName("cloneFormation()")
    class CloneFormation {

        @Test
        @DisplayName("clone une formation existante")
        void shouldCloneFormation() {
            formation.setTitreFormation("Source");
            formation.setTypeBesoin("BESOIN");
            formation.setDomaine("IT");
            formation.setCompetence("Java");
            formation.setPopulationCible("Devs");
            formation.setObjectifs("Obj");
            formation.setObjectifsPedago("Peda");
            formation.setEvalMethods("Eval");
            formation.setTypeFormation(TypeFormation.INTERNE);
            formation.setExterneFormateurNom("Doe");
            formation.setExterneFormateurPrenom("John");
            formation.setExterneFormateurEmail("john@test.com");
            formation.setOrganismeRefExterne("Org");
            formation.setBureauFormationNom("Bureau");
            formation.setBureauFormationMail("b@b.com");
            formation.setBureauFormationTelephone("123");
            formation.setCoutTransport(100f);
            formation.setCoutHebergement(200f);
            formation.setCoutRepas(150f);
            formation.setCoutFormation(500f);
            formation.setPrerequis("Pre");
            formation.setAcquis("Post");
            formation.setIndicateurs("KPI");
            formation.setChargeHoraireGlobal(40);
            formation.setCertifGenerated(true);
            formation.setInscriptionsOuvertes(true);
            formation.setOuverte(true);
            formation.setPeriodCode(PeriodCode.P1);
            formation.setCustomPeriodLabel("P1");
            formation.setSalle("Salle A");

            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(formation));
            when(formationRepository.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(2L);
            dto.setTitreFormation("Clone");
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

            FormationResponseDTO result = formationService.cloneFormation(1L, "Clone");

            assertThat(result).isNotNull();
            assertThat(result.getTitreFormation()).isEqualTo("Clone");
            verify(formationRepository).findByIdWithAllRelations(1L);
            verify(formationRepository).save(any());
        }

        @Test
        @DisplayName("leve ResourceNotFoundException si source introuvable")
        void shouldThrowWhenSourceNotFound() {
            when(formationRepository.findByIdWithAllRelations(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.cloneFormation(999L, "Clone"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("introuvable");
        }

        @Test
        @DisplayName("clone avec animateurs et champs optionnels null")
        void shouldCloneWithNullOptionals() {
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(formation));
            when(formationRepository.save(any(Formation.class))).thenAnswer(inv -> inv.getArgument(0));

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(2L);
            dto.setTitreFormation("Clone");
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

            FormationResponseDTO result = formationService.cloneFormation(1L, "Clone");

            assertThat(result).isNotNull();
            verify(formationRepository).save(any());
        }
    }

    @Nested
    @DisplayName("getFormationByIdWithAllRelations()")
    class GetByIdWithRelations {

        @Test
        @DisplayName("retourne la formation avec toutes ses relations")
        void shouldReturnWithAllRelations() {
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(formation));

            Formation result = formationService.getFormationByIdWithAllRelations(1L);

            assertThat(result).isNotNull();
            assertThat(result.getIdFormation()).isEqualTo(1L);
            verify(formationRepository).findByIdWithAllRelations(1L);
        }

        @Test
        @DisplayName("leve ResourceNotFoundException si introuvable")
        void shouldThrowWhenNotFound() {
            when(formationRepository.findByIdWithAllRelations(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.getFormationByIdWithAllRelations(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
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

            FormationResponseDTO dto = new FormationResponseDTO();
            dto.setIdFormation(1L);
            dto.setTitreFormation("Updated");

            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
            when(formationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            doNothing().when(formationMapper).updateEntityFromRequest(any(UpdateFormationRequest.class), any(Formation.class));
            when(formationMapper.toResponseDTO(any(Formation.class))).thenReturn(dto);

            FormationResponseDTO result = formationService.updateFormation(1L, updateRequest);

            assertThat(result).isNotNull();
        }
    }
}
