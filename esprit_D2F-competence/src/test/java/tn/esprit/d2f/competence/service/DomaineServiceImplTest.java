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
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.dto.DomaineRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DomaineServiceImpl - Tests unitaires")
class DomaineServiceImplTest {

    @Mock private DomaineRepository domaineRepository;
    @Mock private EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Mock private NiveauSavoirRequisRepository niveauRepo;
    @Mock private SavoirRepository savoirRepository;
    @Mock private CompetenceMapper  competenceMapper;

    @InjectMocks private DomaineServiceImpl domaineService;

    private Domaine domaine;
    private DomaineDTO domaineDTO;

    @BeforeEach
    void setUp() {
        domaine = Domaine.builder()
                .id(1L).code("GC-TECH").nom("Technique Génie Civil")
                .description("Domaine technique").actif(true)
                .competences(new ArrayList<>()).build();

        domaineDTO = DomaineDTO.builder()
                .id(1L).code("GC-TECH").nom("Technique Génie Civil")
                .description("Domaine technique").actif(true)
                .competences(List.of()).build();
    }

    // ── GetAll ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("getAllDomaines(Pageable)")
    class GetAll {

        @Test @DisplayName("retourne une page de DomaineDTO")
        void shouldReturnPagedDomaines() {
            Pageable pageable = PageRequest.of(0, 20);
            when(domaineRepository.findAll(pageable))
                    .thenReturn(new PageImpl<>(List.of(domaine)));
            when(competenceMapper.toDTO(any(Domaine.class))).thenReturn(domaineDTO);

            Page<DomaineDTO> page = domaineService.getAllDomaines(pageable);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getCode()).isEqualTo("GC-TECH");
            verify(domaineRepository).findAll(pageable);
        }
    }

    // ── GetById ───────────────────────────────────────────────────────────────
    @Nested @DisplayName("getDomaineById(Long)")
    class GetById {

        @Test @DisplayName("retourne le DTO quand l enregistrement existe")
        void shouldReturnDTOWhenFound() {
            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(competenceMapper.toDTO(domaine)).thenReturn(domaineDTO);

            DomaineDTO result = domaineService.getDomaineById(1L);

            assertThat(result.getId()).isEqualTo(1L);
            verify(domaineRepository).findById(1L);
        }

        @Test @DisplayName("leve une exception quand l enregistrement est absent")
        void shouldThrowWhenNotFound() {
            when(domaineRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> domaineService.getDomaineById(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Create ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("createDomaine(DomaineRequest)")
    class Create {

        @Test @DisplayName("sauvegarde et retourne le DTO")
        void shouldSaveAndReturnDTO() {
            DomaineRequest req = DomaineRequest.builder()
                    .code("GC-TECH").nom("Technique Génie Civil")
                    .description("Domaine technique").actif(true).build();

            when(domaineRepository.existsByCode("GC-TECH")).thenReturn(false);
            when(domaineRepository.save(any(Domaine.class))).thenReturn(domaine);
            when(competenceMapper.toDTO(domaine)).thenReturn(domaineDTO);

            DomaineDTO result = domaineService.createDomaine(req);

            assertThat(result.getCode()).isEqualTo("GC-TECH");
            verify(domaineRepository).save(any(Domaine.class));
        }

        @Test @DisplayName("leve une exception si le code existe deja")
        void shouldThrowIfCodeExists() {
            DomaineRequest req = DomaineRequest.builder()
                    .code("GC-TECH").nom("n").description("d").actif(true).build();
            when(domaineRepository.existsByCode("GC-TECH")).thenReturn(true);

            assertThatThrownBy(() -> domaineService.createDomaine(req))
                    .isInstanceOf(RuntimeException.class);
            verify(domaineRepository, never()).save(any());
        }
    }

    // ── Update ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("updateDomaine(Long, DomaineRequest)")
    class Update {

        @Test @DisplayName("met a jour et retourne le DTO")
        void shouldUpdateAndReturnDTO() {
            DomaineRequest req = DomaineRequest.builder()
                    .code("GC-UPDATED").nom("Nouveau nom")
                    .description("nouvelle desc").actif(false).build();

            Domaine updated = Domaine.builder()
                    .id(1L).code("GC-UPDATED").nom("Nouveau nom")
                    .description("nouvelle desc").actif(false)
                    .competences(new ArrayList<>()).build();

            DomaineDTO updatedDTO = DomaineDTO.builder()
                    .id(1L).code("GC-UPDATED").nom("Nouveau nom")
                    .description("nouvelle desc").actif(false)
                    .competences(List.of()).build();

            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(domaineRepository.save(any(Domaine.class))).thenReturn(updated);
            when(competenceMapper.toDTO(updated)).thenReturn(updatedDTO);

            DomaineDTO result = domaineService.updateDomaine(1L, req);

            assertThat(result.getCode()).isEqualTo("GC-UPDATED");
            verify(domaineRepository).save(any(Domaine.class));
        }

        @Test @DisplayName("leve une exception si le domaine est absent")
        void shouldThrowIfNotFound() {
            DomaineRequest req = DomaineRequest.builder()
                    .code("X").nom("n").description("d").actif(true).build();
            when(domaineRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> domaineService.updateDomaine(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("deleteDomaine(Long)")
    class Delete {

        @Test @DisplayName("supprime quand l enregistrement existe")
        void shouldDeleteWhenFound() {
            when(domaineRepository.existsById(1L)).thenReturn(true);
            when(savoirRepository.findIdsByDomaineId(1L)).thenReturn(List.of());
            doNothing().when(domaineRepository).deleteById(1L);

            domaineService.deleteDomaine(1L);

            verify(niveauRepo).deleteByCompetence_DomaineId(1L);
            verify(niveauRepo).deleteBySousCompetence_Competence_DomaineId(1L);
            verify(domaineRepository).deleteById(1L);
        }

        @Test @DisplayName("leve une exception si le domaine est absent")
        void shouldThrowIfNotFound() {
            when(domaineRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> domaineService.deleteDomaine(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }
}