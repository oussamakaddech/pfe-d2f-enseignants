package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.*;
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.dto.CompetenceRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CompetenceServiceImpl - Tests unitaires")
class CompetenceServiceImplTest {

    @Mock private CompetenceRepository competenceRepository;
    @Mock private DomaineRepository    domaineRepository;
    @Mock private CompetencePrerequisiteRepository prerequisiteRepository;
    @Mock private EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Mock private NiveauSavoirRequisRepository niveauRepo;
    @Mock private SavoirRepository savoirRepository;
    @Mock private SousCompetenceRepository sousCompetenceRepository;
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
            when(prerequisiteRepository.countByCompetenceId(2L)).thenReturn(0L);
            when(prerequisiteRepository.findPrerequisiteNamesByCompetenceId(2L)).thenReturn(List.of());

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
            when(prerequisiteRepository.countByCompetenceId(2L)).thenReturn(0L);
            when(prerequisiteRepository.findPrerequisiteNamesByCompetenceId(2L)).thenReturn(List.of());

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
            when(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(2L)).thenReturn(0L);
            when(prerequisiteRepository.countByCompetenceId(2L)).thenReturn(0L);
            when(prerequisiteRepository.findPrerequisiteNamesByCompetenceId(2L)).thenReturn(List.of());

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
            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.findByCompetenceId(2L)).thenReturn(List.of());
            when(savoirRepository.existsByCompetenceId(2L)).thenReturn(false);
            doNothing().when(competenceRepository).delete(competence);

            competenceService.deleteCompetence(2L);

            verify(competenceRepository).delete(competence);
        }

        @Test @DisplayName("leve une exception si la competence est absente")
        void shouldThrowIfNotFound() {
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> competenceService.deleteCompetence(99L))
                    .isInstanceOf(RuntimeException.class);
        }

        @Test @DisplayName("refuse suppression si contient des sous-competences")
        void shouldRejectDeleteIfNotEmpty() {
            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.findByCompetenceId(2L)).thenReturn(List.of(mock(tn.esprit.d2f.competence.entity.SousCompetence.class)));
            assertThatThrownBy(() -> competenceService.deleteCompetence(2L))
                    .isInstanceOf(tn.esprit.d2f.competence.exception.BusinessException.class);
        }

        @Test @DisplayName("refuse suppression si contient des savoirs directs")
        void shouldRejectDeleteIfHasSavoirs() {
            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.findByCompetenceId(2L)).thenReturn(List.of());
            when(savoirRepository.existsByCompetenceId(2L)).thenReturn(true);
            assertThatThrownBy(() -> competenceService.deleteCompetence(2L))
                    .isInstanceOf(tn.esprit.d2f.competence.exception.BusinessException.class);
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────
    @Test
    void search_ShouldReturnList() {
        when(competenceRepository.searchByKeyword("test")).thenReturn(List.of(competence));
        when(competenceMapper.toDTO(any(Competence.class))).thenReturn(competenceDTO);
        assertThat(competenceService.searchCompetences("test")).hasSize(1);
    }

    @Test
    void searchPaged_ShouldReturnPage() {
        Pageable p = PageRequest.of(0, 10);
        when(competenceRepository.searchByKeyword("test", p)).thenReturn(new PageImpl<>(List.of(competence)));
        when(competenceMapper.toDTO(any(Competence.class))).thenReturn(competenceDTO);
        assertThat(competenceService.searchCompetences("test", p).getContent()).hasSize(1);
    }

    // ── Create/Update Branches ────────────────────────────────────────────────
    @Test
    void create_ShouldThrowIfCodeExists() {
        CompetenceRequest req = CompetenceRequest.builder().code("EXIST").build();
        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(competenceRepository.existsByCode("EXIST")).thenReturn(true);
        assertThatThrownBy(() -> competenceService.createCompetence(1L, req))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void create_ShouldUseDefaultOrdreWhenNull() {
        CompetenceRequest req = CompetenceRequest.builder().code("NEW").nom("N").ordre(null).build();
        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(competenceRepository.existsByCode("NEW")).thenReturn(false);
        when(competenceRepository.save(any(Competence.class))).thenAnswer(inv -> inv.getArgument(0));
        when(competenceMapper.toDTO(any(Competence.class))).thenReturn(competenceDTO);

        competenceService.createCompetence(1L, req);
        verify(competenceRepository).save(argThat(c -> c.getOrdre() == 1));
    }

    @Test
    void update_ShouldNotUpdateOrdreIfNull() {
        CompetenceRequest req = CompetenceRequest.builder().code("C").nom("N").ordre(null).build();
        when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
        when(competenceRepository.save(any(Competence.class))).thenAnswer(inv -> inv.getArgument(0));
        when(competenceMapper.toDTO(any(Competence.class))).thenReturn(competenceDTO);

        competenceService.updateCompetence(2L, req);
        verify(competenceRepository).save(argThat(c -> c.getOrdre() == 1)); // Remains 1 from setUp
    }
}