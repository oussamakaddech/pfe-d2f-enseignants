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
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompetenceServiceImpl - Tests unitaires")
class CompetenceServiceImplTest {

    @Mock CompetenceRepository competenceRepository;
    @Mock DomaineRepository domaineRepository;
    @Mock EnseignantCompetenceRepository enseignantCompetenceRepository;
    @InjectMocks CompetenceServiceImpl competenceService;

    Domaine domaine;
    Competence competence;

    @BeforeEach
    void setUp() {
        domaine = Domaine.builder()
                .id(1L).code("GC-TECH").nom("Génie Civil").actif(true)
                .competences(new ArrayList<>()).build();
        competence = Competence.builder()
                .id(1L).code("GC-C1").nom("Compétences Sols").description("desc").ordre(1)
                .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>())
                .build();
    }

    // ─── getAllCompetences ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("getAllCompetences")
    class GetAll {
        @Test
        void shouldReturnAllCompetences() {
            when(competenceRepository.findAll()).thenReturn(List.of(competence));
            List<CompetenceDTO> result = competenceService.getAllCompetences();
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCode()).isEqualTo("GC-C1");
        }

        @Test
        void shouldReturnEmptyList() {
            when(competenceRepository.findAll()).thenReturn(List.of());
            assertThat(competenceService.getAllCompetences()).isEmpty();
        }
    }

    // ─── getCompetencesByDomaine ───────────────────────────────────────────────
    @Nested
    @DisplayName("getCompetencesByDomaine")
    class GetByDomaine {
        @Test
        void shouldReturnCompetencesForDomaine() {
            when(competenceRepository.findByDomaineId(1L)).thenReturn(List.of(competence));
            List<CompetenceDTO> result = competenceService.getCompetencesByDomaine(1L);
            assertThat(result).hasSize(1);
        }

        @Test
        void shouldReturnEmptyListForUnknownDomaine() {
            when(competenceRepository.findByDomaineId(99L)).thenReturn(List.of());
            assertThat(competenceService.getCompetencesByDomaine(99L)).isEmpty();
        }
    }

    // ─── getCompetenceById ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("getCompetenceById")
    class GetById {
        @Test
        void shouldReturnDTOWhenFound() {
            when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
            CompetenceDTO result = competenceService.getCompetenceById(1L);
            assertThat(result.getId()).isEqualTo(1L);
        }

        @Test
        void shouldThrowEntityNotFoundWhenNotFound() {
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> competenceService.getCompetenceById(99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
        }
    }

    // ─── createCompetence ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("createCompetence")
    class Create {
        @Test
        void shouldCreateWhenDomaineExistsAndCodeUnique() {
            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(competenceRepository.existsByCode("GC-C1")).thenReturn(false);
            when(competenceRepository.save(any())).thenReturn(competence);

            CompetenceDTO result = competenceService.createCompetence(1L, competence);

            assertThat(result.getCode()).isEqualTo("GC-C1");
            verify(competenceRepository).save(competence);
        }

        @Test
        void shouldThrowWhenDomaineNotFound() {
            when(domaineRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> competenceService.createCompetence(99L, competence))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
            verify(competenceRepository, never()).save(any());
        }

        @Test
        void shouldThrowWhenCodeAlreadyExists() {
            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(competenceRepository.existsByCode("GC-C1")).thenReturn(true);

            assertThatThrownBy(() -> competenceService.createCompetence(1L, competence))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("GC-C1");
            verify(competenceRepository, never()).save(any());
        }
    }

    // ─── updateCompetence ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("updateCompetence")
    class Update {
        @Test
        void shouldUpdateAndReturnDTO() {
            Competence updated = Competence.builder()
                    .id(1L).code("GC-C1-UPD").nom("Updated").description("new desc").ordre(2)
                    .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>())
                    .build();
            when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
            when(competenceRepository.save(any())).thenReturn(updated);

            CompetenceDTO result = competenceService.updateCompetence(1L, updated);

            assertThat(result.getCode()).isEqualTo("GC-C1-UPD");
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> competenceService.updateCompetence(99L, competence))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ─── deleteCompetence ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("deleteCompetence")
    class Delete {
        @Test
        void shouldDeleteWithCascadeWhenSavoirsExist() {
            when(competenceRepository.existsById(1L)).thenReturn(true);
            when(enseignantCompetenceRepository.findSavoirIdsByCompetenceId(1L))
                    .thenReturn(List.of(5L, 6L));

            competenceService.deleteCompetence(1L);

            verify(enseignantCompetenceRepository).deleteBySavoirIdIn(List.of(5L, 6L));
            verify(competenceRepository).deleteById(1L);
        }

        @Test
        void shouldDeleteWithoutCascadeWhenNoSavoirs() {
            when(competenceRepository.existsById(1L)).thenReturn(true);
            when(enseignantCompetenceRepository.findSavoirIdsByCompetenceId(1L))
                    .thenReturn(List.of());

            competenceService.deleteCompetence(1L);

            verify(enseignantCompetenceRepository, never()).deleteBySavoirIdIn(any());
            verify(competenceRepository).deleteById(1L);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(competenceRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> competenceService.deleteCompetence(99L))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
