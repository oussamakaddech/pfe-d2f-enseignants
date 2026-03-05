package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;
import tn.esprit.d2f.competence.dto.SousCompetenceRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SousCompetenceServiceImpl - Tests unitaires")
class SousCompetenceServiceImplTest {

    @Mock private SousCompetenceRepository sousCompetenceRepository;
    @Mock private CompetenceRepository     competenceRepository;
    @Mock private CompetenceMapper         competenceMapper;

    @InjectMocks private SousCompetenceServiceImpl sousCompetenceService;

    private Domaine       domaine;
    private Competence    competence;
    private SousCompetence sousCompetence;
    private SousCompetenceDTO sousCompetenceDTO;

    @BeforeEach
    void setUp() {
        domaine = Domaine.builder()
                .id(1L).code("GC-TECH").nom("Technique Génie Civil")
                .description("desc").actif(true).competences(new ArrayList<>()).build();

        competence = Competence.builder()
                .id(2L).code("GC-C1").nom("Compétences Sols").description("desc").ordre(1)
                .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>())
                .build();

        sousCompetence = SousCompetence.builder()
                .id(3L).code("SC-01").nom("Essais géotechniques").description("desc")
                .competence(competence).savoirs(new ArrayList<>()).build();

        sousCompetenceDTO = SousCompetenceDTO.builder()
                .id(3L).code("SC-01").nom("Essais géotechniques").description("desc")
                .competenceId(2L).competenceNom("Compétences Sols")
                .savoirs(List.of()).build();
    }

    // ── GetAll ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("getAllSousCompetences(Pageable)")
    class GetAll {

        @Test @DisplayName("retourne une page de SousCompetenceDTO")
        void shouldReturnPagedSousCompetences() {
            Pageable pageable = PageRequest.of(0, 20);
            when(sousCompetenceRepository.findAll(pageable))
                    .thenReturn(new PageImpl<>(List.of(sousCompetence)));
            when(competenceMapper.toDTO(any(SousCompetence.class))).thenReturn(sousCompetenceDTO);

            Page<SousCompetenceDTO> page = sousCompetenceService.getAllSousCompetences(pageable);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getCode()).isEqualTo("SC-01");
            verify(sousCompetenceRepository).findAll(pageable);
        }
    }

    // ── GetByCompetenceId ─────────────────────────────────────────────────────
    @Nested @DisplayName("getSousCompetencesByCompetenceId(Long)")
    class GetByCompetenceId {

        @Test @DisplayName("retourne la liste filtree par competence")
        void shouldReturnSousCompetencesForCompetence() {
            when(sousCompetenceRepository.findByCompetenceId(2L))
                    .thenReturn(List.of(sousCompetence));
            when(competenceMapper.toDTO(any(SousCompetence.class))).thenReturn(sousCompetenceDTO);

            List<SousCompetenceDTO> result =
                    sousCompetenceService.getSousCompetencesByCompetence(2L);

            assertThat(result).hasSize(1);
            verify(sousCompetenceRepository).findByCompetenceId(2L);
        }
    }

    // ── GetById ───────────────────────────────────────────────────────────────
    @Nested @DisplayName("getSousCompetenceById(Long)")
    class GetById {

        @Test @DisplayName("retourne le DTO quand l enregistrement existe")
        void shouldReturnDTOWhenFound() {
            when(sousCompetenceRepository.findById(3L)).thenReturn(Optional.of(sousCompetence));
            when(competenceMapper.toDTO(sousCompetence)).thenReturn(sousCompetenceDTO);

            SousCompetenceDTO result = sousCompetenceService.getSousCompetenceById(3L);

            assertThat(result.getId()).isEqualTo(3L);
        }

        @Test @DisplayName("leve une exception quand l enregistrement est absent")
        void shouldThrowWhenNotFound() {
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> sousCompetenceService.getSousCompetenceById(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Create ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("createSousCompetence(Long, SousCompetenceRequest)")
    class Create {

        @Test @DisplayName("sauvegarde et retourne le DTO")
        void shouldSaveAndReturnDTO() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("SC-01").nom("Essais géotechniques").description("desc").build();

            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.existsByCode("SC-01")).thenReturn(false);
            when(sousCompetenceRepository.save(any(SousCompetence.class))).thenReturn(sousCompetence);
            when(competenceMapper.toDTO(sousCompetence)).thenReturn(sousCompetenceDTO);

            SousCompetenceDTO result = sousCompetenceService.createSousCompetence(2L, req);

            assertThat(result.getCode()).isEqualTo("SC-01");
            verify(sousCompetenceRepository).save(any(SousCompetence.class));
        }

        @Test @DisplayName("leve une exception si la competence est absente")
        void shouldThrowIfCompetenceNotFound() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("X").nom("n").description("d").build();
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> sousCompetenceService.createSousCompetence(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Update ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("updateSousCompetence(Long, SousCompetenceRequest)")
    class Update {

        @Test @DisplayName("met a jour et retourne le DTO")
        void shouldUpdateAndReturnDTO() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("SC-NEW").nom("Nouveau nom").description("nouvelle desc").build();

            SousCompetence updated = SousCompetence.builder()
                    .id(3L).code("SC-NEW").nom("Nouveau nom").description("nouvelle desc")
                    .competence(competence).savoirs(new ArrayList<>()).build();

            SousCompetenceDTO updatedDTO = SousCompetenceDTO.builder()
                    .id(3L).code("SC-NEW").nom("Nouveau nom").description("nouvelle desc")
                    .competenceId(2L).competenceNom("Compétences Sols").savoirs(List.of()).build();

            when(sousCompetenceRepository.findById(3L)).thenReturn(Optional.of(sousCompetence));
            when(sousCompetenceRepository.save(any(SousCompetence.class))).thenReturn(updated);
            when(competenceMapper.toDTO(updated)).thenReturn(updatedDTO);

            SousCompetenceDTO result = sousCompetenceService.updateSousCompetence(3L, req);

            assertThat(result.getCode()).isEqualTo("SC-NEW");
            verify(sousCompetenceRepository).save(any(SousCompetence.class));
        }

        @Test @DisplayName("leve une exception si la sous-competence est absente")
        void shouldThrowIfNotFound() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("X").nom("n").description("d").build();
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> sousCompetenceService.updateSousCompetence(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("deleteSousCompetence(Long)")
    class Delete {

        @Test @DisplayName("supprime quand l enregistrement existe")
        void shouldDeleteWhenFound() {
            when(sousCompetenceRepository.existsById(3L)).thenReturn(true);
            doNothing().when(sousCompetenceRepository).deleteById(3L);

            sousCompetenceService.deleteSousCompetence(3L);

            verify(sousCompetenceRepository).deleteById(3L);
        }

        @Test @DisplayName("leve une exception si la sous-competence est absente")
        void shouldThrowIfNotFound() {
            when(sousCompetenceRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> sousCompetenceService.deleteSousCompetence(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }
}