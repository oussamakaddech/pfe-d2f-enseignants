package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.dto.SousCompetenceRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SousCompetenceServiceImpl - Tests unitaires")
class SousCompetenceServiceImplTest {

    @Mock private SousCompetenceRepository sousCompetenceRepository;
    @Mock private CompetenceRepository competenceRepository;
    @Mock private EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Mock private NiveauSavoirRequisRepository niveauRepo;
    @Mock private SavoirRepository savoirRepository;
    @Mock private CompetenceMapper competenceMapper;

    @InjectMocks private SousCompetenceServiceImpl sousCompetenceService;

    private Domaine domaine;
    private Competence competence;
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
                .competence(competence).savoirs(new ArrayList<>()).niveau(1).build();

        sousCompetenceDTO = SousCompetenceDTO.builder()
                .id(3L).code("SC-01").nom("Essais géotechniques").description("desc")
                .competenceId(2L).competenceNom("Compétences Sols")
                .niveau(1)
                .savoirs(List.of()).build();
    }

    @Nested
    @DisplayName("getAllSousCompetences(Pageable)")
    class GetAll {

        @Test
        @DisplayName("retourne une page de SousCompetenceDTO")
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

    @Nested
    @DisplayName("getSousCompetencesByCompetence(Long)")
    class GetByCompetenceId {

        @Test
        @DisplayName("retourne les racines pour une competence")
        void shouldReturnRootSousCompetencesForCompetence() {
            when(sousCompetenceRepository.findByCompetenceIdAndParentIsNull(2L))
                    .thenReturn(List.of(sousCompetence));
            when(competenceMapper.toDTO(any(SousCompetence.class))).thenReturn(sousCompetenceDTO);

            List<SousCompetenceDTO> result = sousCompetenceService.getSousCompetencesByCompetence(2L);

            assertThat(result).hasSize(1);
            verify(sousCompetenceRepository).findByCompetenceIdAndParentIsNull(2L);
        }
    }

    @Nested
    @DisplayName("createSousCompetence(Long, SousCompetenceRequest)")
    class Create {

        @Test
        @DisplayName("sauvegarde une sous-competence racine")
        void shouldSaveAndReturnDTO() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("SC-01").nom("Essais géotechniques").description("desc").build();

            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.findByCode("SC-01")).thenReturn(Optional.empty());
            when(sousCompetenceRepository.save(any(SousCompetence.class))).thenReturn(sousCompetence);
            when(competenceMapper.toDTO(sousCompetence)).thenReturn(sousCompetenceDTO);

            SousCompetenceDTO result = sousCompetenceService.createSousCompetence(2L, req);

            assertThat(result.getCode()).isEqualTo("SC-01");
            assertThat(result.getNiveau()).isEqualTo(1);
            verify(sousCompetenceRepository).save(any(SousCompetence.class));
        }

        @Test
        @DisplayName("leve une exception si la competence est absente")
        void shouldThrowIfCompetenceNotFound() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("X").nom("n").description("d").build();
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> sousCompetenceService.createSousCompetence(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    @Nested
    @DisplayName("createSousCompetenceEnfant(Long, SousCompetenceRequest)")
    class CreateChild {

        @Test
        @DisplayName("cree un enfant valide avec niveau parent + 1")
        void shouldCreateChildWithIncrementedLevel() {
            SousCompetence parent = SousCompetence.builder()
                    .id(10L).code("SC-P").nom("Parent")
                    .competence(competence)
                    .niveau(2)
                    .savoirs(new ArrayList<>())
                    .build();

            SousCompetence child = SousCompetence.builder()
                    .id(11L).code("SC-C").nom("Child")
                    .competence(competence)
                    .parent(parent)
                    .niveau(3)
                    .savoirs(new ArrayList<>())
                    .build();

            SousCompetenceDTO childDTO = SousCompetenceDTO.builder()
                    .id(11L).code("SC-C").nom("Child")
                    .competenceId(2L).competenceNom("Compétences Sols")
                    .parentId(10L)
                    .niveau(3)
                    .build();

            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("SC-C").nom("Child").description("desc").build();

            when(sousCompetenceRepository.findById(10L)).thenReturn(Optional.of(parent));
            when(sousCompetenceRepository.findByCode("SC-C")).thenReturn(Optional.empty());
            when(sousCompetenceRepository.save(any(SousCompetence.class))).thenReturn(child);
            when(competenceMapper.toDTO(child)).thenReturn(childDTO);

            SousCompetenceDTO result = sousCompetenceService.createSousCompetenceEnfant(10L, req);

            assertThat(result.getParentId()).isEqualTo(10L);
            assertThat(result.getNiveau()).isEqualTo(3);
        }

        @Test
        @DisplayName("refuse creation enfant si parent contient des savoirs")
        void shouldRejectChildCreationWhenParentHasSavoirs() {
            SousCompetence parent = SousCompetence.builder()
                    .id(10L).code("SC-P").nom("Parent")
                    .competence(competence)
                    .niveau(2)
                    .savoirs(List.of(Savoir.builder().id(88L).code("S-X").nom("sx").build()))
                    .build();

            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("SC-C").nom("Child").description("desc").build();

            when(sousCompetenceRepository.findById(10L)).thenReturn(Optional.of(parent));

            assertThatThrownBy(() -> sousCompetenceService.createSousCompetenceEnfant(10L, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("contient déjà des savoirs");
        }

        @Test
        @DisplayName("refuse creation enfant si profondeur max atteinte")
        void shouldRejectChildCreationWhenDepthLimitReached() {
            SousCompetence parent = SousCompetence.builder()
                    .id(10L).code("SC-P").nom("Parent")
                    .competence(competence)
                    .niveau(5)
                    .savoirs(new ArrayList<>())
                    .build();

            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("SC-C").nom("Child").description("desc").build();

            when(sousCompetenceRepository.findById(10L)).thenReturn(Optional.of(parent));

            assertThatThrownBy(() -> sousCompetenceService.createSousCompetenceEnfant(10L, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Profondeur maximale");
        }
    }

    @Nested
    @DisplayName("updateSousCompetence(Long, SousCompetenceRequest)")
    class Update {

        @Test
        @DisplayName("met a jour et retourne le DTO")
        void shouldUpdateAndReturnDTO() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("SC-NEW").nom("Nouveau nom").description("nouvelle desc").build();

            SousCompetence updated = SousCompetence.builder()
                    .id(3L).code("SC-NEW").nom("Nouveau nom").description("nouvelle desc")
                    .competence(competence).savoirs(new ArrayList<>()).niveau(1).build();

            SousCompetenceDTO updatedDTO = SousCompetenceDTO.builder()
                    .id(3L).code("SC-NEW").nom("Nouveau nom").description("nouvelle desc")
                    .competenceId(2L).competenceNom("Compétences Sols").niveau(1).savoirs(List.of()).build();

            when(sousCompetenceRepository.findById(3L)).thenReturn(Optional.of(sousCompetence));
            when(sousCompetenceRepository.findByCode("SC-NEW")).thenReturn(Optional.empty());
            when(sousCompetenceRepository.save(any(SousCompetence.class))).thenReturn(updated);
            when(competenceMapper.toDTO(updated)).thenReturn(updatedDTO);

            SousCompetenceDTO result = sousCompetenceService.updateSousCompetence(3L, req);

            assertThat(result.getCode()).isEqualTo("SC-NEW");
            verify(sousCompetenceRepository).save(any(SousCompetence.class));
        }

        @Test
        @DisplayName("leve une exception si la sous-competence est absente")
        void shouldThrowIfNotFound() {
            SousCompetenceRequest req = SousCompetenceRequest.builder()
                    .code("X").nom("n").description("d").build();
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> sousCompetenceService.updateSousCompetence(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    @Nested
    @DisplayName("deleteSousCompetence(Long)")
    class Delete {

        @Test
        @DisplayName("supprime quand l enregistrement existe")
        void shouldDeleteWhenFound() {
            when(sousCompetenceRepository.findById(3L)).thenReturn(Optional.of(sousCompetence));
            when(sousCompetenceRepository.findByParentId(3L)).thenReturn(List.of());
            when(savoirRepository.findIdsBySousCompetenceId(3L)).thenReturn(List.of());
            doNothing().when(sousCompetenceRepository).deleteById(3L);

            sousCompetenceService.deleteSousCompetence(3L);

            verify(sousCompetenceRepository).deleteById(3L);
        }

        @Test
        @DisplayName("leve une exception si la sous-competence est absente")
        void shouldThrowIfNotFound() {
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> sousCompetenceService.deleteSousCompetence(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }
}
