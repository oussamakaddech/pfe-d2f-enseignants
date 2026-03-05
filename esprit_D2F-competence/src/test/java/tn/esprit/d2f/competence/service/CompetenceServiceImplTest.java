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
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.dto.CompetenceRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompetenceServiceImpl - Tests unitaires")
class CompetenceServiceImplTest {

    @Mock private CompetenceRepository competenceRepository;
    @Mock private DomaineRepository    domaineRepository;
    @Mock private CompetenceMapper     competenceMapper;

    @InjectMocks private CompetenceServiceImpl competenceService;

    private Domaine    domaine;
    private Competence competence;
    private CompetenceDTO competenceDTO;

    @BeforeEach
    void setUp() {
        domaine = Domaine.builder()
                .id(1L).code("GC-TECH").nom("Technique Génie Civil")
                .description("desc").actif(true).competences(new ArrayList<>()).build();

        competence = Competence.builder()
                .id(2L).code("GC-C1").nom("Compétences Sols").description("desc").ordre(1)
                .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>())
                .build();

        competenceDTO = CompetenceDTO.builder()
                .id(2L).code("GC-C1").nom("Compétences Sols").description("desc").ordre(1)
                .domaineId(1L).domaineNom("Technique Génie Civil")
                .sousCompetences(List.of()).savoirs(List.of()).build();
    }

    // ── GetAll ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("getAllCompetences(Pageable)")
    class GetAll {

        @Test @DisplayName("retourne une page de CompetenceDTO")
        void shouldReturnPagedCompetences() {
            Pageable pageable = PageRequest.of(0, 20);
            when(competenceRepository.findAllWithDomaine(pageable))
                    .thenReturn(new PageImpl<>(List.of(competence)));
            when(competenceMapper.toDTO(any(Competence.class))).thenReturn(competenceDTO);

            Page<CompetenceDTO> page = competenceService.getAllCompetences(pageable);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getCode()).isEqualTo("GC-C1");
            verify(competenceRepository).findAllWithDomaine(pageable);
        }
    }

    // ── GetByDomaineId ────────────────────────────────────────────────────────
    @Nested @DisplayName("getCompetencesByDomaineId(Long)")
    class GetByDomaineId {

        @Test @DisplayName("retourne la liste filtree par domaine")
        void shouldReturnCompetencesForDomaine() {
            when(competenceRepository.findByDomaineIdWithDomaine(1L))
                    .thenReturn(List.of(competence));
            when(competenceMapper.toDTO(any(Competence.class))).thenReturn(competenceDTO);

            List<CompetenceDTO> result = competenceService.getCompetencesByDomaine(1L);

            assertThat(result).hasSize(1);
            verify(competenceRepository).findByDomaineIdWithDomaine(1L);
        }
    }

    // ── GetById ───────────────────────────────────────────────────────────────
    @Nested @DisplayName("getCompetenceById(Long)")
    class GetById {

        @Test @DisplayName("retourne le DTO quand l enregistrement existe")
        void shouldReturnDTOWhenFound() {
            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(competenceMapper.toDTO(competence)).thenReturn(competenceDTO);

            CompetenceDTO result = competenceService.getCompetenceById(2L);

            assertThat(result.getId()).isEqualTo(2L);
        }

        @Test @DisplayName("leve une exception quand l enregistrement est absent")
        void shouldThrowWhenNotFound() {
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> competenceService.getCompetenceById(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Create ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("createCompetence(Long, CompetenceRequest)")
    class Create {

        @Test @DisplayName("sauvegarde et retourne le DTO")
        void shouldSaveAndReturnDTO() {
            CompetenceRequest req = CompetenceRequest.builder()
                    .code("GC-C1").nom("Compétences Sols")
                    .description("desc").ordre(1).build();

            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(competenceRepository.existsByCode("GC-C1")).thenReturn(false);
            when(competenceRepository.save(any(Competence.class))).thenReturn(competence);
            when(competenceMapper.toDTO(competence)).thenReturn(competenceDTO);

            CompetenceDTO result = competenceService.createCompetence(1L, req);

            assertThat(result.getCode()).isEqualTo("GC-C1");
            verify(competenceRepository).save(any(Competence.class));
        }

        @Test @DisplayName("leve une exception si le domaine est absent")
        void shouldThrowIfDomaineNotFound() {
            CompetenceRequest req = CompetenceRequest.builder()
                    .code("X").nom("n").description("d").ordre(1).build();
            when(domaineRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> competenceService.createCompetence(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Update ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("updateCompetence(Long, CompetenceRequest)")
    class Update {

        @Test @DisplayName("met a jour et retourne le DTO")
        void shouldUpdateAndReturnDTO() {
            CompetenceRequest req = CompetenceRequest.builder()
                    .code("GC-C1-NEW").nom("Nouveau nom")
                    .description("nouvelle desc").ordre(2).build();

            Competence updated = Competence.builder()
                    .id(2L).code("GC-C1-NEW").nom("Nouveau nom")
                    .description("nouvelle desc").ordre(2)
                    .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>())
                    .build();

            CompetenceDTO updatedDTO = CompetenceDTO.builder()
                    .id(2L).code("GC-C1-NEW").nom("Nouveau nom")
                    .description("nouvelle desc").ordre(2)
                    .domaineId(1L).domaineNom("Technique Génie Civil")
                    .sousCompetences(List.of()).savoirs(List.of()).build();

            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(competenceRepository.save(any(Competence.class))).thenReturn(updated);
            when(competenceMapper.toDTO(updated)).thenReturn(updatedDTO);

            CompetenceDTO result = competenceService.updateCompetence(2L, req);

            assertThat(result.getCode()).isEqualTo("GC-C1-NEW");
            verify(competenceRepository).save(any(Competence.class));
        }

        @Test @DisplayName("leve une exception si la competence est absente")
        void shouldThrowIfNotFound() {
            CompetenceRequest req = CompetenceRequest.builder()
                    .code("X").nom("n").description("d").ordre(1).build();
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> competenceService.updateCompetence(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("deleteCompetence(Long)")
    class Delete {

        @Test @DisplayName("supprime quand l enregistrement existe")
        void shouldDeleteWhenFound() {
            when(competenceRepository.existsById(2L)).thenReturn(true);
            doNothing().when(competenceRepository).deleteById(2L);

            competenceService.deleteCompetence(2L);

            verify(competenceRepository).deleteById(2L);
        }

        @Test @DisplayName("leve une exception si la competence est absente")
        void shouldThrowIfNotFound() {
            when(competenceRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> competenceService.deleteCompetence(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }
}