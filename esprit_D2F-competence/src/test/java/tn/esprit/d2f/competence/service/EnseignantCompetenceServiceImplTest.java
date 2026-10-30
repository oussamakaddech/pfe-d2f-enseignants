package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.competence.dto.AffectationGroupeeRequest;
import tn.esprit.d2f.competence.dto.AffectationGroupeeResultDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;
import tn.esprit.d2f.competence.service.IEnseignantCompetenceService;

import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EnseignantCompetenceServiceImpl - Tests unitaires")
class EnseignantCompetenceServiceImplTest {

    @Mock EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Mock SavoirRepository savoirRepository;
    @Mock SousCompetenceRepository sousCompetenceRepository;
    @Mock CompetenceRepository competenceRepository;
    @Mock CompetenceMapper competenceMapper;
    @Mock IEnseignantCompetenceService self;
    @Mock AffectationScopeService affectationScopeService;
    @InjectMocks EnseignantCompetenceServiceImpl ecService;

    static final String ENS_ID = "ens-uuid-001";
    Savoir savoir;
    EnseignantCompetence ec;

    @BeforeEach
    void setUp() {
        Domaine domaine = Domaine.builder().id(1L).code("GC").nom("Génie Civil")
                .actif(true).competences(new ArrayList<>()).build();
        Competence competence = Competence.builder().id(1L).code("C1").nom("Sols")
                .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>()).build();
        SousCompetence sc = SousCompetence.builder().id(1L).code("GC-C1.SC01").nom("Essais")
                .competence(competence).savoirs(new ArrayList<>()).build();
        savoir = Savoir.builder().id(1L).code("S2a").nom("Essai labo")
                .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT)
                .sousCompetence(sc).build();
        ec = EnseignantCompetence.builder()
                .id(1L).enseignantId(ENS_ID).savoir(savoir)
                .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                .dateAcquisition(LocalDate.of(2025, Month.JANUARY, 15))
                .commentaire("Bon niveau")
                .build();

        lenient().when(competenceMapper.toDTO(any(EnseignantCompetence.class))).thenAnswer(invocation -> {
            EnseignantCompetence value = invocation.getArgument(0);
            return EnseignantCompetenceDTO.builder()
                .id(value.getId())
                .enseignantId(value.getEnseignantId())
                .savoirId(value.getSavoir() != null ? value.getSavoir().getId() : null)
                .niveau(value.getNiveau())
                .dateAcquisition(value.getDateAcquisition())
                .commentaire(value.getCommentaire())
                .build();
        });
    }

    // ─── getCompetencesByEnseignant ────────────────────────────────────────────
    @Nested
    @DisplayName("getCompetencesByEnseignant")
    class GetByEnseignant {
        @Test
        void shouldReturnListForEnseignant() {
            when(enseignantCompetenceRepository.findByEnseignantId(ENS_ID))
                    .thenReturn(List.of(ec));
            List<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignant(ENS_ID);
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEnseignantId()).isEqualTo(ENS_ID);
        }

        @Test
        void shouldReturnEmptyForUnknownEnseignant() {
            when(enseignantCompetenceRepository.findByEnseignantId("unknown"))
                    .thenReturn(List.of());
            assertThat(ecService.getCompetencesByEnseignant("unknown")).isEmpty();
        }
    }

    // ─── getCompetencesByEnseignantAndDomaine ──────────────────────────────────
    @Nested
    @DisplayName("getCompetencesByEnseignantAndDomaine")
    class GetByEnseignantAndDomaine {
        @Test
        void shouldFilter() {
            when(enseignantCompetenceRepository.findByEnseignantIdAndDomaineId(ENS_ID, 1L))
                    .thenReturn(List.of(ec));
            List<EnseignantCompetenceDTO> result =
                    ecService.getCompetencesByEnseignantAndDomaine(ENS_ID, 1L);
            assertThat(result).hasSize(1);
        }
    }

    // ─── getCompetencesByEnseignantAndNiveau ───────────────────────────────────
    @Nested
    @DisplayName("getCompetencesByEnseignantAndNiveau")
    class GetByEnseignantAndNiveau {
        @Test
        void shouldFilterByNiveau() {
            when(enseignantCompetenceRepository
                    .findByEnseignantIdAndNiveau(ENS_ID, NiveauMaitrise.N2_ELEMENTAIRE))
                    .thenReturn(List.of(ec));
            List<EnseignantCompetenceDTO> result =
                    ecService.getCompetencesByEnseignantAndNiveau(ENS_ID, NiveauMaitrise.N2_ELEMENTAIRE);
            assertThat(result).hasSize(1);
        }
    }

    // ─── assignCompetence ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("assignCompetence")
    class Assign {
        @Test
        void shouldAssignWhenSavoirExistsAndNoDuplicate() {
            EnseignantCompetenceRequest req = new EnseignantCompetenceRequest();
            req.setEnseignantId(ENS_ID);
            req.setSavoirId(1L);
            req.setNiveau(NiveauMaitrise.N2_ELEMENTAIRE);

            when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
            when(enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId(ENS_ID, 1L))
                    .thenReturn(false);
            when(enseignantCompetenceRepository.save(any())).thenReturn(ec);

            EnseignantCompetenceDTO result = ecService.assignCompetence(req);

            assertThat(result.getEnseignantId()).isEqualTo(ENS_ID);
            assertThat(result.getNiveau()).isEqualTo(NiveauMaitrise.N2_ELEMENTAIRE);
            verify(enseignantCompetenceRepository).save(any());
        }

        @Test
        void shouldThrowWhenSavoirNotFound() {
            EnseignantCompetenceRequest req = new EnseignantCompetenceRequest();
            req.setEnseignantId(ENS_ID);
            req.setSavoirId(99L);
            req.setNiveau(NiveauMaitrise.N1_DEBUTANT);

            when(savoirRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> ecService.assignCompetence(req))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
            verify(enseignantCompetenceRepository, never()).save(any());
        }

        @Test
        void shouldThrowWhenDuplicateAssignment() {
            EnseignantCompetenceRequest req = new EnseignantCompetenceRequest();
            req.setEnseignantId(ENS_ID);
            req.setSavoirId(1L);
            req.setNiveau(NiveauMaitrise.N1_DEBUTANT);

            when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
            when(enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId(ENS_ID, 1L))
                    .thenReturn(true);

            assertThatThrownBy(() -> ecService.assignCompetence(req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("déjà");
            verify(enseignantCompetenceRepository, never()).save(any());
        }
    }

    // ─── updateNiveau ─────────────────────────────────────────────────────────
    @Nested
    @DisplayName("updateNiveau")
    class UpdateNiveau {
        @Test
        void shouldUpdateNiveauWhenFound() {
            EnseignantCompetence upgraded = EnseignantCompetence.builder()
                    .id(1L).enseignantId(ENS_ID).savoir(savoir)
                    .niveau(NiveauMaitrise.N4_AVANCE)
                    .dateAcquisition(LocalDate.now()).build();
            when(enseignantCompetenceRepository.findById(1L)).thenReturn(Optional.of(ec));
            when(enseignantCompetenceRepository.save(any())).thenReturn(upgraded);

            EnseignantCompetenceDTO result = ecService.updateNiveau(1L, NiveauMaitrise.N4_AVANCE);

            assertThat(result.getNiveau()).isEqualTo(NiveauMaitrise.N4_AVANCE);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(enseignantCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> ecService.updateNiveau(99L, NiveauMaitrise.N3_INTERMEDIAIRE))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ─── removeCompetence ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("removeCompetence")
    class Remove {
        @Test
        void shouldRemoveWhenFound() {
            when(enseignantCompetenceRepository.findById(1L)).thenReturn(Optional.of(ec));

            ecService.removeCompetence(1L);

            verify(enseignantCompetenceRepository).deleteById(1L);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(enseignantCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> ecService.removeCompetence(99L))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ── Périmètre d'écriture (CUP / chef de département) ────────────────────
    @Nested
    @DisplayName("périmètre des affectations")
    class Perimetre {

        @Test
        void shouldCheckPerimeterOnAssign() {
            EnseignantCompetenceRequest req = new EnseignantCompetenceRequest();
            req.setEnseignantId(ENS_ID);
            req.setSavoirId(1L);
            req.setNiveau(NiveauMaitrise.N2_ELEMENTAIRE);
            when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
            when(enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId(ENS_ID, 1L))
                    .thenReturn(false);
            when(enseignantCompetenceRepository.save(any())).thenReturn(ec);

            ecService.assignCompetence(req);

            verify(affectationScopeService).assertCanManage(ENS_ID);
        }

        @Test
        void shouldRefuseAssignOutsidePerimeter() {
            EnseignantCompetenceRequest req = new EnseignantCompetenceRequest();
            req.setEnseignantId("ENS_HORS_PERIMETRE");
            req.setSavoirId(1L);
            req.setNiveau(NiveauMaitrise.N2_ELEMENTAIRE);
            doThrow(new org.springframework.security.access.AccessDeniedException("hors périmètre"))
                    .when(affectationScopeService).assertCanManage("ENS_HORS_PERIMETRE");

            assertThatThrownBy(() -> ecService.assignCompetence(req))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(enseignantCompetenceRepository, never()).save(any());
        }

        @Test
        void shouldCheckPerimeterOnUpdateNiveau() {
            when(enseignantCompetenceRepository.findById(1L)).thenReturn(Optional.of(ec));
            when(enseignantCompetenceRepository.save(any())).thenReturn(ec);

            ecService.updateNiveau(1L, NiveauMaitrise.N4_AVANCE);

            verify(affectationScopeService).assertCanManage(ENS_ID);
        }

        @Test
        void shouldCheckPerimeterOnRemove() {
            when(enseignantCompetenceRepository.findById(1L)).thenReturn(Optional.of(ec));

            ecService.removeCompetence(1L);

            verify(affectationScopeService).assertCanManage(ENS_ID);
        }

        @Test
        void shouldExposePerimeterOfCurrentUser() {
            tn.esprit.d2f.competence.dto.PerimetreAffectationDTO dto =
                    tn.esprit.d2f.competence.dto.PerimetreAffectationDTO.builder()
                            .global(false).upId("UP_GC").enseignantIds(List.of(ENS_ID)).build();
            when(affectationScopeService.describePerimetre()).thenReturn(dto);

            assertThat(ecService.getPerimetre()).isSameAs(dto);
        }
    }

    // ─── countCompetences ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("countCompetences")
    class CountCompetences {
        @Test
        void shouldReturnCorrectCount() {
            when(enseignantCompetenceRepository.countByEnseignantId(ENS_ID)).thenReturn(5L);
            long count = ecService.countCompetences(ENS_ID);
            assertThat(count).isEqualTo(5L);
        }

        @Test
        void shouldReturnZeroWhenNoCompetences() {
            when(enseignantCompetenceRepository.countByEnseignantId("new-ens")).thenReturn(0L);
            assertThat(ecService.countCompetences("new-ens")).isZero();
        }
    }

    // ─── getAll ───────────────────────────────────────────────────────────────
    @Test
    void getAll_ShouldReturnPagedDTOs() {
        Pageable pageable = PageRequest.of(0, 10);
        when(enseignantCompetenceRepository.findAllFetched(pageable))
                .thenReturn(new PageImpl<>(List.of(ec)));
        
        Page<EnseignantCompetenceDTO> result = ecService.getAll(pageable);
        
        assertThat(result.getContent()).hasSize(1);
        verify(enseignantCompetenceRepository).findAllFetched(pageable);
    }

    @Test
    void getCompetencesByEnseignant_Page_ShouldReturnFirstSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = competenceMapper.toDTO(ec);
        when(self.getCompetencesByEnseignant(ENS_ID)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignant(ENS_ID, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getCompetencesByEnseignant_Page_ShouldReturnEmptyWhenOffsetPastEnd() {
        Pageable pageable = PageRequest.of(2, 1);
        EnseignantCompetenceDTO dto = competenceMapper.toDTO(ec);
        when(self.getCompetencesByEnseignant(ENS_ID)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignant(ENS_ID, pageable);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getCompetencesByEnseignantAndDomaine_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = competenceMapper.toDTO(ec);
        when(self.getCompetencesByEnseignantAndDomaine(ENS_ID, 1L)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignantAndDomaine(ENS_ID, 1L, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getCompetencesByEnseignantAndCompetence_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = competenceMapper.toDTO(ec);
        when(self.getCompetencesByEnseignantAndCompetence(ENS_ID, 1L)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignantAndCompetence(ENS_ID, 1L, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getCompetencesByEnseignantAndNiveau_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = competenceMapper.toDTO(ec);
        when(self.getCompetencesByEnseignantAndNiveau(ENS_ID, NiveauMaitrise.N2_ELEMENTAIRE)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignantAndNiveau(ENS_ID, NiveauMaitrise.N2_ELEMENTAIRE, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getByCompetenceId_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = competenceMapper.toDTO(ec);
        when(self.getByCompetenceId(1L)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getByCompetenceId(1L, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    // ─── getByCompetenceId ────────────────────────────────────────────────────
    @Test
    void getByCompetenceId_ShouldReturnList() {
        when(enseignantCompetenceRepository.findByCompetenceId(1L))
                .thenReturn(List.of(ec));
        
        List<EnseignantCompetenceDTO> result = ecService.getByCompetenceId(1L);
        
        assertThat(result).hasSize(1);
        verify(enseignantCompetenceRepository).findByCompetenceId(1L);
    }

    // ─── getCompetencesByEnseignantAndCompetence ──────────────────────────────
    @Test
    void getCompetencesByEnseignantAndCompetence_ShouldReturnList() {
        when(enseignantCompetenceRepository.findByEnseignantIdAndCompetenceId(ENS_ID, 1L))
                .thenReturn(List.of(ec));
        
        List<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignantAndCompetence(ENS_ID, 1L);
        
        assertThat(result).hasSize(1);
    }

    @Test
    void assignCompetence_ShouldUseDefaultNiveauWhenNull() {
        EnseignantCompetenceRequest req = new EnseignantCompetenceRequest();
        req.setEnseignantId(ENS_ID);
        req.setSavoirId(1L);
        req.setNiveau(null); // Should default to N1

        when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
        when(enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId(ENS_ID, 1L)).thenReturn(false);
        when(enseignantCompetenceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EnseignantCompetenceDTO result = ecService.assignCompetence(req);

        assertThat(result.getNiveau()).isEqualTo(NiveauMaitrise.N1_DEBUTANT);
    }

    // ─── assignGroupee ────────────────────────────────────────────────────────
    @Nested
    @DisplayName("assignGroupee")
    class AssignGroupee {

        private Savoir autreSavoir;

        @BeforeEach
        void initAutreSavoir() {
            autreSavoir = Savoir.builder().id(2L).code("S2b").nom("Sondage")
                    .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT).build();
        }

        @Test
        @DisplayName("une compétence affecte TOUS ses savoirs (directs + sous-compétences)")
        void shouldAssignEverySavoirOfCompetence() {
            when(competenceRepository.existsById(10L)).thenReturn(true);
            when(savoirRepository.findByCompetenceWithSousCompetences(10L))
                    .thenReturn(List.of(savoir, autreSavoir));
            when(enseignantCompetenceRepository.findByEnseignantId(ENS_ID)).thenReturn(List.of());

            AffectationGroupeeRequest req = AffectationGroupeeRequest.builder()
                    .enseignantId(ENS_ID).competenceId(10L)
                    .niveau(NiveauMaitrise.N3_INTERMEDIAIRE).build();

            AffectationGroupeeResultDTO result = ecService.assignGroupee(req);

            assertThat(result.getTotal()).isEqualTo(2);
            assertThat(result.getCrees()).isEqualTo(2);
            assertThat(result.getDejaAffectes()).isZero();
            assertThat(result.getSavoirIds()).containsExactly(1L, 2L);

            @SuppressWarnings("unchecked")
            org.mockito.ArgumentCaptor<List<EnseignantCompetence>> captor =
                    org.mockito.ArgumentCaptor.forClass(List.class);
            verify(enseignantCompetenceRepository).saveAll(captor.capture());
            assertThat(captor.getValue()).hasSize(2)
                    .allSatisfy(affectation -> {
                        assertThat(affectation.getEnseignantId()).isEqualTo(ENS_ID);
                        assertThat(affectation.getNiveau()).isEqualTo(NiveauMaitrise.N3_INTERMEDIAIRE);
                    });
        }

        @Test
        @DisplayName("les savoirs déjà affectés sont conservés (aucun doublon, niveau inchangé)")
        void shouldKeepExistingAssignmentsUntouched() {
            when(competenceRepository.existsById(10L)).thenReturn(true);
            when(savoirRepository.findByCompetenceWithSousCompetences(10L))
                    .thenReturn(List.of(savoir, autreSavoir));
            when(enseignantCompetenceRepository.findByEnseignantId(ENS_ID)).thenReturn(List.of(ec));

            AffectationGroupeeResultDTO result = ecService.assignGroupee(
                    AffectationGroupeeRequest.builder().enseignantId(ENS_ID).competenceId(10L).build());

            assertThat(result.getTotal()).isEqualTo(2);
            assertThat(result.getCrees()).isEqualTo(1);
            assertThat(result.getDejaAffectes()).isEqualTo(1);

            @SuppressWarnings("unchecked")
            org.mockito.ArgumentCaptor<List<EnseignantCompetence>> captor =
                    org.mockito.ArgumentCaptor.forClass(List.class);
            verify(enseignantCompetenceRepository).saveAll(captor.capture());
            assertThat(captor.getValue()).singleElement()
                    .satisfies(affectation -> assertThat(affectation.getSavoir().getId()).isEqualTo(2L));
        }

        @Test
        @DisplayName("un rejeu intégral n'écrit rien (idempotent)")
        void shouldNotWriteWhenEverythingAlreadyAssigned() {
            when(competenceRepository.existsById(10L)).thenReturn(true);
            when(savoirRepository.findByCompetenceWithSousCompetences(10L)).thenReturn(List.of(savoir));
            when(enseignantCompetenceRepository.findByEnseignantId(ENS_ID)).thenReturn(List.of(ec));

            AffectationGroupeeResultDTO result = ecService.assignGroupee(
                    AffectationGroupeeRequest.builder().enseignantId(ENS_ID).competenceId(10L).build());

            assertThat(result.getCrees()).isZero();
            assertThat(result.getDejaAffectes()).isEqualTo(1);
            verify(enseignantCompetenceRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("une sous-compétence inclut ses descendantes")
        void shouldExpandSousCompetenceTree() {
            SousCompetence enfant = SousCompetence.builder().id(6L).code("SC-ENF").nom("Enfant").build();
            when(sousCompetenceRepository.existsById(5L)).thenReturn(true);
            when(sousCompetenceRepository.findByParentId(5L)).thenReturn(List.of(enfant));
            when(sousCompetenceRepository.findByParentId(6L)).thenReturn(List.of());
            when(savoirRepository.findBySousCompetenceIdIn(anyCollection())).thenReturn(List.of(savoir));
            when(enseignantCompetenceRepository.findByEnseignantId(ENS_ID)).thenReturn(List.of());

            ecService.assignGroupee(AffectationGroupeeRequest.builder()
                    .enseignantId(ENS_ID).sousCompetenceId(5L).build());

            @SuppressWarnings("unchecked")
            org.mockito.ArgumentCaptor<Collection<Long>> captor =
                    org.mockito.ArgumentCaptor.forClass(Collection.class);
            verify(savoirRepository).findBySousCompetenceIdIn(captor.capture());
            assertThat(captor.getValue()).containsExactlyInAnyOrder(5L, 6L);
        }

        @Test
        @DisplayName("une liste explicite de savoirs est dédoublonnée")
        void shouldDeduplicateExplicitSavoirIds() {
            when(savoirRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(savoir, autreSavoir));
            when(enseignantCompetenceRepository.findByEnseignantId(ENS_ID)).thenReturn(List.of());

            AffectationGroupeeResultDTO result = ecService.assignGroupee(AffectationGroupeeRequest.builder()
                    .enseignantId(ENS_ID).savoirIds(List.of(1L, 2L, 2L, 1L)).build());

            assertThat(result.getTotal()).isEqualTo(2);
            assertThat(result.getCrees()).isEqualTo(2);
        }

        @Test
        @DisplayName("aucun périmètre → 400")
        void shouldRejectMissingPerimetre() {
            assertThatThrownBy(() -> ecService.assignGroupee(
                    AffectationGroupeeRequest.builder().enseignantId(ENS_ID).build()))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("périmètre");
        }

        @Test
        @DisplayName("compétence inconnue → 404")
        void shouldThrowWhenCompetenceUnknown() {
            when(competenceRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> ecService.assignGroupee(
                    AffectationGroupeeRequest.builder().enseignantId(ENS_ID).competenceId(99L).build()))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
            verify(enseignantCompetenceRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("savoir inconnu dans une liste explicite → 404")
        void shouldThrowWhenOneSavoirIdIsUnknown() {
            when(savoirRepository.findAllById(List.of(1L, 99L))).thenReturn(List.of(savoir));

            assertThatThrownBy(() -> ecService.assignGroupee(AffectationGroupeeRequest.builder()
                    .enseignantId(ENS_ID).savoirIds(List.of(1L, 99L)).build()))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
            verify(enseignantCompetenceRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("compétence sans savoir → aucun écrit, résultat vide")
        void shouldReturnEmptyResultWhenCompetenceHasNoSavoir() {
            when(competenceRepository.existsById(10L)).thenReturn(true);
            when(savoirRepository.findByCompetenceWithSousCompetences(10L)).thenReturn(List.of());
            when(enseignantCompetenceRepository.findByEnseignantId(ENS_ID)).thenReturn(List.of());

            AffectationGroupeeResultDTO result = ecService.assignGroupee(
                    AffectationGroupeeRequest.builder().enseignantId(ENS_ID).competenceId(10L).build());

            assertThat(result.getTotal()).isZero();
            assertThat(result.getSavoirIds()).isEmpty();
            verify(enseignantCompetenceRepository, never()).saveAll(any());
        }
    }
}
