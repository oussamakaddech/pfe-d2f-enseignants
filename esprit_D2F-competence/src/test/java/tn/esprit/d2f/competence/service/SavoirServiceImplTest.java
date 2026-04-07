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
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.dto.SavoirRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
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
@DisplayName("SavoirServiceImpl - Tests unitaires")
class SavoirServiceImplTest {

    @Mock private SavoirRepository savoirRepository;
    @Mock private NiveauSavoirRequisRepository niveauRepo;
    @Mock private SousCompetenceRepository sousCompetenceRepository;
    @Mock private CompetenceRepository competenceRepository;
    @Mock private EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Mock private CompetenceMapper competenceMapper;

    @InjectMocks private SavoirServiceImpl savoirService;

    private Domaine domaine;
    private Competence competence;
    private SousCompetence sousCompetence;
    private Savoir savoir;
    private SavoirDTO savoirDTO;

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
                .id(3L).code("GC-C1.SC01").nom("Essais géotechniques").description("desc")
                .competence(competence).savoirs(new ArrayList<>()).niveau(1).build();

        savoir = Savoir.builder()
                .id(4L).code("S2a").nom("Essai de classification").description("desc")
                .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT)
                .sousCompetence(sousCompetence).build();

        savoirDTO = SavoirDTO.builder()
                .id(4L).code("S2a").nom("Essai de classification").description("desc")
                .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT)
                .sousCompetenceId(3L).sousCompetenceNom("Essais géotechniques")
                .competenceId(2L).competenceNom("Compétences Sols").build();
    }

    @Nested
    @DisplayName("getAllSavoirs(Pageable)")
    class GetAll {

        @Test
        @DisplayName("retourne une page de SavoirDTO")
        void shouldReturnPagedSavoirs() {
            Pageable pageable = PageRequest.of(0, 20);
            when(savoirRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(savoir)));
            when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(savoirDTO);

            Page<SavoirDTO> page = savoirService.getAllSavoirs(pageable);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getCode()).isEqualTo("S2a");
            verify(savoirRepository).findAll(pageable);
        }
    }

    @Nested
    @DisplayName("createSavoir(Long sousCompetenceId, SavoirRequest)")
    class Create {

        @Test
        @DisplayName("sauvegarde et retourne le DTO pour une sous-competence feuille")
        void shouldSaveAndReturnDTOForLeaf() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("S2a").nom("Essai de classification").description("desc")
                    .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT).build();

            when(sousCompetenceRepository.findById(3L)).thenReturn(Optional.of(sousCompetence));
            when(sousCompetenceRepository.existsByParentId(3L)).thenReturn(false);
            when(savoirRepository.existsByCode("S2a")).thenReturn(false);
            when(savoirRepository.save(any(Savoir.class))).thenReturn(savoir);
            when(competenceMapper.toDTO(savoir)).thenReturn(savoirDTO);

            SavoirDTO result = savoirService.createSavoir(3L, req);

            assertThat(result.getCode()).isEqualTo("S2a");
            verify(savoirRepository).save(any(Savoir.class));
        }

        @Test
        @DisplayName("refuse creation sur sous-competence non feuille")
        void shouldRejectCreateOnNonLeafSousCompetence() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("S2a").nom("Essai de classification").description("desc")
                    .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT).build();

            when(sousCompetenceRepository.findById(3L)).thenReturn(Optional.of(sousCompetence));
            when(sousCompetenceRepository.existsByParentId(3L)).thenReturn(true);

            assertThatThrownBy(() -> savoirService.createSavoir(3L, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("non feuille");
        }
    }

    @Nested
    @DisplayName("createSavoirForCompetence(Long competenceId, SavoirRequest)")
    class CreateForCompetence {

        @Test
        @DisplayName("sauvegarde un savoir direct si competence sans sous-competences")
        void shouldSaveDirectSavoirWhenNoSousCompetence() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("S2b").nom("Essai de compactage").description("desc")
                    .type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N2_ELEMENTAIRE).build();

            Savoir savoir2 = Savoir.builder()
                    .id(5L).code("S2b").nom("Essai de compactage").description("desc")
                    .type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                    .competence(competence).build();

            SavoirDTO savoirDTO2 = SavoirDTO.builder()
                    .id(5L).code("S2b").nom("Essai de compactage").description("desc")
                    .type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                    .competenceId(2L).competenceNom("Compétences Sols").build();

            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.findByCompetenceIdAndParentIsNull(2L)).thenReturn(List.of());
            when(savoirRepository.existsByCode("S2b")).thenReturn(false);
            when(savoirRepository.save(any(Savoir.class))).thenReturn(savoir2);
            when(competenceMapper.toDTO(savoir2)).thenReturn(savoirDTO2);

            SavoirDTO result = savoirService.createSavoirForCompetence(2L, req);

            assertThat(result.getCode()).isEqualTo("S2b");
            verify(savoirRepository).save(any(Savoir.class));
        }

        @Test
        @DisplayName("refuse savoir direct si competence a des sous-competences")
        void shouldRejectDirectSavoirWhenCompetenceHasSousCompetences() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("S2b").nom("Essai de compactage").description("desc")
                    .type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N2_ELEMENTAIRE).build();

            when(competenceRepository.findById(2L)).thenReturn(Optional.of(competence));
            when(sousCompetenceRepository.findByCompetenceIdAndParentIsNull(2L)).thenReturn(List.of(sousCompetence));

            assertThatThrownBy(() -> savoirService.createSavoirForCompetence(2L, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("savoir direct");
        }
    }

    @Nested
    @DisplayName("deleteSavoir(Long)")
    class Delete {

        @Test
        @DisplayName("supprime quand l enregistrement existe")
        void shouldDeleteWhenFound() {
            when(savoirRepository.existsById(4L)).thenReturn(true);
            doNothing().when(savoirRepository).deleteById(4L);

            savoirService.deleteSavoir(4L);

            verify(niveauRepo).deleteBySavoirId(4L);
            verify(enseignantCompetenceRepository).deleteBySavoirId(4L);
            verify(savoirRepository).deleteById(4L);
        }

        @Test
        @DisplayName("leve une exception si le savoir est absent")
        void shouldThrowIfNotFound() {
            when(savoirRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> savoirService.deleteSavoir(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }
}
