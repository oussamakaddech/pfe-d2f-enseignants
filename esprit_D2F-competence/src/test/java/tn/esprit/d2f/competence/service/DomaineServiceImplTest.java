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

    // ── Getters ───────────────────────────────────────────────────────────────
    @Test
    @DisplayName("getDomainesActifs: retourne la liste des domaines actifs")
    void shouldReturnActifs() {
        when(domaineRepository.findByActifTrue()).thenReturn(List.of(domaine));
        when(competenceMapper.toDTO(any(Domaine.class))).thenReturn(domaineDTO);
        List<DomaineDTO> result = domaineService.getDomainesActifs();
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getDomaineByCode: retourne le DTO")
    void shouldReturnByCode() {
        when(domaineRepository.findByCode("GC-TECH")).thenReturn(Optional.of(domaine));
        when(competenceMapper.toDTO(domaine)).thenReturn(domaineDTO);
        DomaineDTO result = domaineService.getDomaineByCode("GC-TECH");
        assertThat(result).isNotNull();
    }

    // ── Search ────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("searchDomaines")
    class Search {
        @Test
        @DisplayName("recherche par mot-clé (liste)")
        void shouldSearchList() {
            when(domaineRepository.searchByKeyword("test")).thenReturn(List.of(domaine));
            when(competenceMapper.toDTOLight(any(Domaine.class))).thenReturn(domaineDTO);
            List<DomaineDTO> result = domaineService.searchDomaines("test");
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("recherche par mot-clé (page)")
        void shouldSearchPage() {
            Pageable pageable = PageRequest.of(0, 10);
            when(domaineRepository.searchByKeyword("test", pageable)).thenReturn(new PageImpl<>(List.of(domaine)));
            when(competenceMapper.toDTOLight(any(Domaine.class))).thenReturn(domaineDTO);
            Page<DomaineDTO> result = domaineService.searchDomaines("test", pageable);
            assertThat(result.getContent()).hasSize(1);
        }
    }

    // ── Toggle ────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("toggleActif: change l'état actif")
    void shouldToggleActif() {
        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(domaineRepository.save(any(Domaine.class))).thenReturn(domaine);
        when(competenceMapper.toDTOLight(any(Domaine.class))).thenReturn(domaineDTO);

        DomaineDTO result = domaineService.toggleActif(1L);
        assertThat(result).isNotNull();
        verify(domaineRepository).save(any(Domaine.class));
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("deleteDomaine(Long)")
    class Delete {

        @Test @DisplayName("supprime quand l enregistrement existe")
        void shouldDeleteWhenFound() {
            when(domaineRepository.existsById(1L)).thenReturn(true);
            when(savoirRepository.findIdsByDomaineId(1L)).thenReturn(List.of(10L));
            doNothing().when(domaineRepository).deleteById(1L);

            domaineService.deleteDomaine(1L);

            verify(niveauRepo).deleteByCompetence_DomaineId(1L);
            verify(niveauRepo).deleteBySousCompetence_Competence_DomaineId(1L);
            verify(niveauRepo).deleteBySavoirIdIn(List.of(10L));
            verify(enseignantCompetenceRepository).deleteBySavoirIdIn(List.of(10L));
            verify(domaineRepository).deleteById(1L);
        }

        @Test @DisplayName("leve une exception si le domaine est absent")
        void shouldThrowIfNotFound() {
            when(domaineRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> domaineService.deleteDomaine(99L))
                    .isInstanceOf(RuntimeException.class);
        }

        @Test @DisplayName("supprime sans savoirs liés")
        void shouldDeleteWithNoSavoirs() {
            when(domaineRepository.existsById(1L)).thenReturn(true);
            when(savoirRepository.findIdsByDomaineId(1L)).thenReturn(List.of());
            doNothing().when(domaineRepository).deleteById(1L);

            domaineService.deleteDomaine(1L);

            verify(niveauRepo).deleteByCompetence_DomaineId(1L);
            verify(niveauRepo).deleteBySousCompetence_Competence_DomaineId(1L);
            verify(niveauRepo, never()).deleteBySavoirIdIn(anyList());
            verify(enseignantCompetenceRepository, never()).deleteBySavoirIdIn(anyList());
            verify(domaineRepository).deleteById(1L);
        }
    }

    // ── GetByCode not found ─────────────────────────────────────────────────
    @Test
    @DisplayName("getDomaineByCode: leve une exception si le code est absent")
    void shouldThrowWhenCodeNotFound() {
        when(domaineRepository.findByCode("UNKNOWN")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> domaineService.getDomaineByCode("UNKNOWN"))
                .isInstanceOf(RuntimeException.class);
    }

    // ── Create with actif=false ─────────────────────────────────────────────
    @Test
    @DisplayName("createDomaine: actif=false définit actif à false")
    void shouldCreateDomaineWithActifFalse() {
        DomaineRequest req = DomaineRequest.builder()
                .code("NEW").nom("Nouveau").description("desc").actif(false).build();
        Domaine newDomaine = Domaine.builder()
                .id(2L).code("NEW").nom("Nouveau").description("desc").actif(false)
                .competences(new ArrayList<>()).build();
        DomaineDTO newDTO = DomaineDTO.builder()
                .id(2L).code("NEW").nom("Nouveau").description("desc").actif(false)
                .competences(List.of()).build();

        when(domaineRepository.existsByCode("NEW")).thenReturn(false);
        when(domaineRepository.save(any(Domaine.class))).thenReturn(newDomaine);
        when(competenceMapper.toDTO(any(Domaine.class))).thenReturn(newDTO);

        DomaineDTO result = domaineService.createDomaine(req);

        assertThat(result).isNotNull();
        verify(domaineRepository).save(argThat(d -> !d.getActif()));
    }

    // ── Update with actif=null ──────────────────────────────────────────────
    @Test
    @DisplayName("updateDomaine: actif=null ne change pas l'état actif")
    void shouldUpdateWithoutChangingActifWhenNull() {
        DomaineRequest req = DomaineRequest.builder()
                .code("GC-TECH").nom("Updated").description("desc").actif(null).build();

        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(domaineRepository.save(any(Domaine.class))).thenReturn(domaine);
        when(competenceMapper.toDTO(any(Domaine.class))).thenReturn(domaineDTO);

        domaineService.updateDomaine(1L, req);

        verify(domaineRepository).save(argThat(Domaine::getActif)); // reste true
    }

    // ── GetByFilter ─────────────────────────────────────────────────────────
    @Test
    @DisplayName("getDomainesByFilter(upId, departementId) retourne la liste filtrée")
    void shouldReturnFilteredDomaines() {
        when(domaineRepository.findByUpIdAndDepartementId("1", "2")).thenReturn(List.of(domaine));
        when(competenceMapper.toDTO(any(Domaine.class))).thenReturn(domaineDTO);

        List<DomaineDTO> result = domaineService.getDomainesByFilter("1", "2");

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getDomainesByFilter(upId, departementId, pageable) retourne la page filtrée")
    void shouldReturnFilteredDomainesPaged() {
        Pageable pageable = PageRequest.of(0, 20);
        when(domaineRepository.findByUpIdAndDepartementId("1", "2", pageable))
                .thenReturn(new PageImpl<>(List.of(domaine)));
        when(competenceMapper.toDTO(any(Domaine.class))).thenReturn(domaineDTO);

        Page<DomaineDTO> result = domaineService.getDomainesByFilter("1", "2", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getDomainesActifsByFilter retourne les domaines actifs filtrés")
    void shouldReturnActifsByFilter() {
        when(domaineRepository.findActifsByUpIdAndDepartementId("1", "2")).thenReturn(List.of(domaine));
        when(competenceMapper.toDTO(any(Domaine.class))).thenReturn(domaineDTO);

        List<DomaineDTO> result = domaineService.getDomainesActifsByFilter("1", "2");

        assertThat(result).hasSize(1);
    }

    // ── Toggle not found ────────────────────────────────────────────────────
    @Test
    @DisplayName("toggleActif: leve une exception si domaine absent")
    void shouldThrowWhenToggleNotFound() {
        when(domaineRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> domaineService.toggleActif(99L))
                .isInstanceOf(RuntimeException.class);
    }
}