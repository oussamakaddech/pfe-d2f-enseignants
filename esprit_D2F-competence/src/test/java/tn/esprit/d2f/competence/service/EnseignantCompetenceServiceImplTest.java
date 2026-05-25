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
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;

import java.time.LocalDate;
import java.util.ArrayList;
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
    @Mock CompetenceMapper competenceMapper;
    @Mock IEnseignantCompetenceService self;
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
                .dateAcquisition(LocalDate.of(2025, 1, 15))
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
            when(enseignantCompetenceRepository.existsById(1L)).thenReturn(true);

            ecService.removeCompetence(1L);

            verify(enseignantCompetenceRepository).deleteById(1L);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(enseignantCompetenceRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> ecService.removeCompetence(99L))
                    .isInstanceOf(EntityNotFoundException.class);
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
        EnseignantCompetenceDTO dto = EnseignantCompetenceDTO.builder()
            .id(1L)
            .enseignantId(ENS_ID)
            .savoirId(1L)
            .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
            .dateAcquisition(LocalDate.of(2025, 1, 15))
            .commentaire("Bon niveau")
            .build();
        when(self.getCompetencesByEnseignant(ENS_ID)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignant(ENS_ID, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getCompetencesByEnseignant_Page_ShouldReturnEmptyWhenOffsetPastEnd() {
        Pageable pageable = PageRequest.of(2, 1);
        EnseignantCompetenceDTO dto = EnseignantCompetenceDTO.builder()
            .id(1L)
            .enseignantId(ENS_ID)
            .savoirId(1L)
            .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
            .dateAcquisition(LocalDate.of(2025, 1, 15))
            .commentaire("Bon niveau")
            .build();
        when(self.getCompetencesByEnseignant(ENS_ID)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignant(ENS_ID, pageable);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getCompetencesByEnseignantAndDomaine_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = EnseignantCompetenceDTO.builder()
            .id(1L)
            .enseignantId(ENS_ID)
            .savoirId(1L)
            .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
            .dateAcquisition(LocalDate.of(2025, 1, 15))
            .commentaire("Bon niveau")
            .build();
        when(self.getCompetencesByEnseignantAndDomaine(ENS_ID, 1L)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignantAndDomaine(ENS_ID, 1L, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getCompetencesByEnseignantAndCompetence_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = EnseignantCompetenceDTO.builder()
            .id(1L)
            .enseignantId(ENS_ID)
            .savoirId(1L)
            .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
            .dateAcquisition(LocalDate.of(2025, 1, 15))
            .commentaire("Bon niveau")
            .build();
        when(self.getCompetencesByEnseignantAndCompetence(ENS_ID, 1L)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignantAndCompetence(ENS_ID, 1L, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getCompetencesByEnseignantAndNiveau_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = EnseignantCompetenceDTO.builder()
            .id(1L)
            .enseignantId(ENS_ID)
            .savoirId(1L)
            .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
            .dateAcquisition(LocalDate.of(2025, 1, 15))
            .commentaire("Bon niveau")
            .build();
        when(self.getCompetencesByEnseignantAndNiveau(ENS_ID, NiveauMaitrise.N2_ELEMENTAIRE)).thenReturn(List.of(dto));

        Page<EnseignantCompetenceDTO> result = ecService.getCompetencesByEnseignantAndNiveau(ENS_ID, NiveauMaitrise.N2_ELEMENTAIRE, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getByCompetenceId_Page_ShouldReturnSlice() {
        Pageable pageable = PageRequest.of(0, 1);
        EnseignantCompetenceDTO dto = EnseignantCompetenceDTO.builder()
            .id(1L)
            .enseignantId(ENS_ID)
            .savoirId(1L)
            .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
            .dateAcquisition(LocalDate.of(2025, 1, 15))
            .commentaire("Bon niveau")
            .build();
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
}
