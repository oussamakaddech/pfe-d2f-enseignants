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
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SavoirServiceImpl - Tests unitaires")
class SavoirServiceImplTest {

    @Mock SavoirRepository savoirRepository;
    @Mock SousCompetenceRepository sousCompetenceRepository;
    @Mock CompetenceRepository competenceRepository;
    @Mock EnseignantCompetenceRepository enseignantCompetenceRepository;
    @InjectMocks SavoirServiceImpl savoirService;

    Domaine domaine;
    Competence competence;
    SousCompetence sousCompetence;
    Savoir savoir;

    @BeforeEach
    void setUp() {
        domaine = Domaine.builder().id(1L).code("GC-TECH").nom("Génie Civil")
                .actif(true).competences(new ArrayList<>()).build();
        competence = Competence.builder().id(1L).code("GC-C1").nom("Sols")
                .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>()).build();
        sousCompetence = SousCompetence.builder().id(1L).code("SC-01").nom("Essais")
                .competence(competence).savoirs(new ArrayList<>()).build();
        savoir = Savoir.builder().id(1L).code("S2a").nom("Essai de classification")
                .description("desc").type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT)
                .sousCompetence(sousCompetence).build();
    }

    @Nested
    @DisplayName("getAllSavoirs")
    class GetAll {
        @Test
        void shouldReturnAll() {
            when(savoirRepository.findAll()).thenReturn(List.of(savoir));
            List<SavoirDTO> result = savoirService.getAllSavoirs();
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCode()).isEqualTo("S2a");
        }
    }

    @Nested
    @DisplayName("getSavoirsBySousCompetence")
    class GetBySousCompetence {
        @Test
        void shouldReturnSavoirsForSousCompetence() {
            when(savoirRepository.findBySousCompetenceId(1L)).thenReturn(List.of(savoir));
            assertThat(savoirService.getSavoirsBySousCompetence(1L)).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getSavoirsByType")
    class GetByType {
        @Test
        void shouldReturnSavoirsOfType() {
            when(savoirRepository.findByType(TypeSavoir.PRATIQUE)).thenReturn(List.of(savoir));
            List<SavoirDTO> result = savoirService.getSavoirsByType(TypeSavoir.PRATIQUE);
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getType()).isEqualTo(TypeSavoir.PRATIQUE);
        }
    }

    @Nested
    @DisplayName("getSavoirById")
    class GetById {
        @Test
        void shouldReturnDTOWhenFound() {
            when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
            SavoirDTO result = savoirService.getSavoirById(1L);
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getCode()).isEqualTo("S2a");
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(savoirRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.getSavoirById(99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
        }
    }

    @Nested
    @DisplayName("createSavoir (pour SousCompétence)")
    class CreateForSousCompetence {
        @Test
        void shouldCreateWhenSousCompetenceExistsAndCodeUnique() {
            when(sousCompetenceRepository.findById(1L)).thenReturn(Optional.of(sousCompetence));
            when(savoirRepository.existsByCode("S2a")).thenReturn(false);
            when(savoirRepository.save(any())).thenReturn(savoir);

            SavoirDTO result = savoirService.createSavoir(1L, savoir);

            assertThat(result.getCode()).isEqualTo("S2a");
            verify(savoirRepository).save(savoir);
        }

        @Test
        void shouldThrowWhenSousCompetenceNotFound() {
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.createSavoir(99L, savoir))
                    .isInstanceOf(EntityNotFoundException.class);
            verify(savoirRepository, never()).save(any());
        }

        @Test
        void shouldThrowWhenCodeDuplicated() {
            when(sousCompetenceRepository.findById(1L)).thenReturn(Optional.of(sousCompetence));
            when(savoirRepository.existsByCode("S2a")).thenReturn(true);

            assertThatThrownBy(() -> savoirService.createSavoir(1L, savoir))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("S2a");
        }
    }

    @Nested
    @DisplayName("createSavoirForCompetence")
    class CreateForCompetence {
        @Test
        void shouldCreateDirectlyForCompetence() {
            when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
            when(savoirRepository.existsByCode("S2a")).thenReturn(false);
            when(savoirRepository.save(any())).thenReturn(savoir);

            SavoirDTO result = savoirService.createSavoirForCompetence(1L, savoir);

            assertThat(result.getCode()).isEqualTo("S2a");
        }

        @Test
        void shouldThrowWhenCompetenceNotFound() {
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.createSavoirForCompetence(99L, savoir))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updateSavoir")
    class Update {
        @Test
        void shouldUpdateNomAndType() {
            Savoir updated = Savoir.builder().id(1L).code("S2a-UPD").nom("Essai Proctor")
                    .description("desc2").type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                    .sousCompetence(sousCompetence).build();
            when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
            when(savoirRepository.save(any())).thenReturn(updated);

            SavoirDTO result = savoirService.updateSavoir(1L, updated);

            assertThat(result.getCode()).isEqualTo("S2a-UPD");
            assertThat(result.getType()).isEqualTo(TypeSavoir.THEORIQUE);
        }

        @Test
        void shouldNotUpdateNiveauWhenNull() {
            Savoir req = Savoir.builder().code("S2a").nom("nom").type(TypeSavoir.PRATIQUE)
                    .niveau(null).sousCompetence(sousCompetence).build();
            when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
            when(savoirRepository.save(any())).thenReturn(savoir);  // niveau unchanged

            SavoirDTO result = savoirService.updateSavoir(1L, req);

            assertThat(result.getNiveau()).isEqualTo(NiveauMaitrise.N1_DEBUTANT);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(savoirRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.updateSavoir(99L, savoir))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("deleteSavoir")
    class Delete {
        @Test
        void shouldDeleteWithCascade() {
            when(savoirRepository.existsById(1L)).thenReturn(true);

            savoirService.deleteSavoir(1L);

            verify(enseignantCompetenceRepository).deleteBySavoirId(1L);
            verify(savoirRepository).deleteById(1L);
        }

        @Test
        void shouldThrowWhenNotFound() {
            when(savoirRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> savoirService.deleteSavoir(99L))
                    .isInstanceOf(EntityNotFoundException.class);
            verify(savoirRepository, never()).deleteById(any());
        }
    }

    @Nested
    @DisplayName("searchSavoirs")
    class Search {
        @Test
        void shouldDelegateToRepository() {
            when(savoirRepository.searchByKeyword("beton")).thenReturn(List.of(savoir));
            List<SavoirDTO> result = savoirService.searchSavoirs("beton");
            assertThat(result).hasSize(1);
        }

        @Test
        void shouldReturnEmptyWhenNoMatch() {
            when(savoirRepository.searchByKeyword("inconnu")).thenReturn(List.of());
            assertThat(savoirService.searchSavoirs("inconnu")).isEmpty();
        }
    }
}
