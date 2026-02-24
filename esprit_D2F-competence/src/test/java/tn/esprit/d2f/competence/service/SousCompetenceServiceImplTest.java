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
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SousCompetenceServiceImpl - Tests unitaires")
class SousCompetenceServiceImplTest {

    @Mock SousCompetenceRepository sousCompetenceRepository;
    @Mock CompetenceRepository competenceRepository;
    @Mock EnseignantCompetenceRepository enseignantCompetenceRepository;
    @InjectMocks SousCompetenceServiceImpl sousCompetenceService;

    Competence competence;
    SousCompetence sousCompetence;

    @BeforeEach
    void setUp() {
        Domaine domaine = Domaine.builder()
                .id(1L).code("GC-TECH").nom("Génie Civil").actif(true)
                .competences(new ArrayList<>()).build();
        competence = Competence.builder()
                .id(1L).code("GC-C1").nom("Sols").domaine(domaine)
                .sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>()).build();
        sousCompetence = SousCompetence.builder()
                .id(1L).code("SC-01").nom("Essais géotechniques").description("desc")
                .competence(competence).savoirs(new ArrayList<>()).build();
    }

    @Nested
    @DisplayName("getAllSousCompetences")
    class GetAll {
        @Test
        void shouldReturnAll() {
            when(sousCompetenceRepository.findAll()).thenReturn(List.of(sousCompetence));
            List<SousCompetenceDTO> result = sousCompetenceService.getAllSousCompetences();
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCode()).isEqualTo("SC-01");
        }

        @Test
        void shouldReturnEmptyList() {
            when(sousCompetenceRepository.findAll()).thenReturn(List.of());
            assertThat(sousCompetenceService.getAllSousCompetences()).isEmpty();
        }
    }

    @Nested
    @DisplayName("getSousCompetencesByCompetence")
    class GetByCompetence {
        @Test
        void shouldReturnForCompetence() {
            when(sousCompetenceRepository.findByCompetenceId(1L)).thenReturn(List.of(sousCompetence));
            List<SousCompetenceDTO> result = sousCompetenceService.getSousCompetencesByCompetence(1L);
            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getSousCompetenceById")
    class GetById {
        @Test
        void shouldReturnDTOWhenFound() {
            when(sousCompetenceRepository.findById(1L)).thenReturn(Optional.of(sousCompetence));
            SousCompetenceDTO result = sousCompetenceService.getSousCompetenceById(1L);
            assertThat(result.getId()).isEqualTo(1L);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> sousCompetenceService.getSousCompetenceById(99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
        }
    }

    @Nested
    @DisplayName("createSousCompetence")
    class Create {
        @Test
        void shouldCreateWhenCompetenceExistsAndCodeUnique() {
            when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.existsByCode("SC-01")).thenReturn(false);
            when(sousCompetenceRepository.save(any())).thenReturn(sousCompetence);

            SousCompetenceDTO result = sousCompetenceService.createSousCompetence(1L, sousCompetence);

            assertThat(result.getCode()).isEqualTo("SC-01");
            verify(sousCompetenceRepository).save(sousCompetence);
        }

        @Test
        void shouldThrowWhenCompetenceNotFound() {
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> sousCompetenceService.createSousCompetence(99L, sousCompetence))
                    .isInstanceOf(EntityNotFoundException.class);
            verify(sousCompetenceRepository, never()).save(any());
        }

        @Test
        void shouldThrowWhenCodeDuplicated() {
            when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.existsByCode("SC-01")).thenReturn(true);

            assertThatThrownBy(() -> sousCompetenceService.createSousCompetence(1L, sousCompetence))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("SC-01");
        }
    }

    @Nested
    @DisplayName("updateSousCompetence")
    class Update {
        @Test
        void shouldUpdateWhenFound() {
            SousCompetence updated = SousCompetence.builder()
                    .id(1L).code("SC-01-UPD").nom("Updated").description("new")
                    .competence(competence).savoirs(new ArrayList<>()).build();
            when(sousCompetenceRepository.findById(1L)).thenReturn(Optional.of(sousCompetence));
            when(sousCompetenceRepository.save(any())).thenReturn(updated);

            SousCompetenceDTO result = sousCompetenceService.updateSousCompetence(1L, updated);

            assertThat(result.getCode()).isEqualTo("SC-01-UPD");
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> sousCompetenceService.updateSousCompetence(99L, sousCompetence))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("deleteSousCompetence")
    class Delete {
        @Test
        void shouldDeleteWithCascade() {
            when(sousCompetenceRepository.existsById(1L)).thenReturn(true);
            when(enseignantCompetenceRepository.findSavoirIdsBySousCompetenceId(1L))
                    .thenReturn(List.of(10L));

            sousCompetenceService.deleteSousCompetence(1L);

            verify(enseignantCompetenceRepository).deleteBySavoirIdIn(List.of(10L));
            verify(sousCompetenceRepository).deleteById(1L);
        }

        @Test
        void shouldDeleteWithoutCascadeWhenEmpty() {
            when(sousCompetenceRepository.existsById(1L)).thenReturn(true);
            when(enseignantCompetenceRepository.findSavoirIdsBySousCompetenceId(1L))
                    .thenReturn(List.of());

            sousCompetenceService.deleteSousCompetence(1L);

            verify(enseignantCompetenceRepository, never()).deleteBySavoirIdIn(any());
            verify(sousCompetenceRepository).deleteById(1L);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(sousCompetenceRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> sousCompetenceService.deleteSousCompetence(99L))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
