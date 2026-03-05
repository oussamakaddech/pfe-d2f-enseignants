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
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;
import tn.esprit.d2f.competence.dto.SavoirRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SavoirServiceImpl - Tests unitaires")
class SavoirServiceImplTest {

    @Mock private SavoirRepository         savoirRepository;
    @Mock private SousCompetenceRepository sousCompetenceRepository;
    @Mock private CompetenceRepository     competenceRepository;
    @Mock private CompetenceMapper         competenceMapper;

    @InjectMocks private SavoirServiceImpl savoirService;

    private Domaine       domaine;
    private Competence    competence;
    private SousCompetence sousCompetence;
    private Savoir        savoir;
    private SavoirDTO     savoirDTO;

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

    // ── GetAll ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("getAllSavoirs(Pageable)")
    class GetAll {

        @Test @DisplayName("retourne une page de SavoirDTO")
        void shouldReturnPagedSavoirs() {
            Pageable pageable = PageRequest.of(0, 20);
            when(savoirRepository.findAll(pageable))
                    .thenReturn(new PageImpl<>(List.of(savoir)));
            when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(savoirDTO);

            Page<SavoirDTO> page = savoirService.getAllSavoirs(pageable);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getCode()).isEqualTo("S2a");
            verify(savoirRepository).findAll(pageable);
        }
    }

    // ── GetById ───────────────────────────────────────────────────────────────
    @Nested @DisplayName("getSavoirById(Long)")
    class GetById {

        @Test @DisplayName("retourne le DTO quand l enregistrement existe")
        void shouldReturnDTOWhenFound() {
            when(savoirRepository.findById(4L)).thenReturn(Optional.of(savoir));
            when(competenceMapper.toDTO(savoir)).thenReturn(savoirDTO);

            SavoirDTO result = savoirService.getSavoirById(4L);

            assertThat(result.getId()).isEqualTo(4L);
        }

        @Test @DisplayName("leve une exception quand l enregistrement est absent")
        void shouldThrowWhenNotFound() {
            when(savoirRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.getSavoirById(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Create for SousCompetence ─────────────────────────────────────────────
    @Nested @DisplayName("createSavoir(Long sousCompetenceId, SavoirRequest)")
    class Create {

        @Test @DisplayName("sauvegarde et retourne le DTO")
        void shouldSaveAndReturnDTO() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("S2a").nom("Essai de classification").description("desc")
                    .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT).build();

            when(sousCompetenceRepository.findById(3L)).thenReturn(Optional.of(sousCompetence));
            when(savoirRepository.existsByCode("S2a")).thenReturn(false);
            when(savoirRepository.save(any(Savoir.class))).thenReturn(savoir);
            when(competenceMapper.toDTO(savoir)).thenReturn(savoirDTO);

            SavoirDTO result = savoirService.createSavoir(3L, req);

            assertThat(result.getCode()).isEqualTo("S2a");
            verify(savoirRepository).save(any(Savoir.class));
        }

        @Test @DisplayName("leve une exception si la sous-competence est absente")
        void shouldThrowIfSousCompetenceNotFound() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("X").nom("n").description("d")
                    .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT).build();
            when(sousCompetenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.createSavoir(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Create for Competence ─────────────────────────────────────────────────
    @Nested @DisplayName("createSavoirForCompetence(Long competenceId, SavoirRequest)")
    class CreateForCompetence {

        @Test @DisplayName("sauvegarde et retourne le DTO")
        void shouldSaveAndReturnDTO() {
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
            when(savoirRepository.existsByCode("S2b")).thenReturn(false);
            when(savoirRepository.save(any(Savoir.class))).thenReturn(savoir2);
            when(competenceMapper.toDTO(savoir2)).thenReturn(savoirDTO2);

            SavoirDTO result = savoirService.createSavoirForCompetence(2L, req);

            assertThat(result.getCode()).isEqualTo("S2b");
            verify(savoirRepository).save(any(Savoir.class));
        }

        @Test @DisplayName("leve une exception si la competence est absente")
        void shouldThrowIfCompetenceNotFound() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("X").nom("n").description("d")
                    .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT).build();
            when(competenceRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.createSavoirForCompetence(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Update ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("updateSavoir(Long, SavoirRequest)")
    class Update {

        @Test @DisplayName("met a jour et retourne le DTO")
        void shouldUpdateAndReturnDTO() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("S2a-NEW").nom("Nouveau nom").description("nouvelle desc")
                    .type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N3_INTERMEDIAIRE).build();

            Savoir updated = Savoir.builder()
                    .id(4L).code("S2a-NEW").nom("Nouveau nom").description("nouvelle desc")
                    .type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N3_INTERMEDIAIRE)
                    .sousCompetence(sousCompetence).build();

            SavoirDTO updatedDTO = SavoirDTO.builder()
                    .id(4L).code("S2a-NEW").nom("Nouveau nom").description("nouvelle desc")
                    .type(TypeSavoir.THEORIQUE).niveau(NiveauMaitrise.N3_INTERMEDIAIRE)
                    .sousCompetenceId(3L).sousCompetenceNom("Essais géotechniques")
                    .competenceId(2L).competenceNom("Compétences Sols").build();

            when(savoirRepository.findById(4L)).thenReturn(Optional.of(savoir));
            when(savoirRepository.save(any(Savoir.class))).thenReturn(updated);
            when(competenceMapper.toDTO(updated)).thenReturn(updatedDTO);

            SavoirDTO result = savoirService.updateSavoir(4L, req);

            assertThat(result.getCode()).isEqualTo("S2a-NEW");
            verify(savoirRepository).save(any(Savoir.class));
        }

        @Test @DisplayName("leve une exception si le savoir est absent")
        void shouldThrowIfNotFound() {
            SavoirRequest req = SavoirRequest.builder()
                    .code("X").nom("n").description("d")
                    .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT).build();
            when(savoirRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> savoirService.updateSavoir(99L, req))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("deleteSavoir(Long)")
    class Delete {

        @Test @DisplayName("supprime quand l enregistrement existe")
        void shouldDeleteWhenFound() {
            when(savoirRepository.existsById(4L)).thenReturn(true);
            doNothing().when(savoirRepository).deleteById(4L);

            savoirService.deleteSavoir(4L);

            verify(savoirRepository).deleteById(4L);
        }

        @Test @DisplayName("leve une exception si le savoir est absent")
        void shouldThrowIfNotFound() {
            when(savoirRepository.existsById(99L)).thenReturn(false);
            assertThatThrownBy(() -> savoirService.deleteSavoir(99L))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────
    @Nested @DisplayName("searchSavoirs(String)")
    class Search {

        @Test @DisplayName("retourne la liste filtree par mot-cle")
        void shouldReturnMatchingSavoirs() {
            when(savoirRepository.searchByKeyword("essai")).thenReturn(List.of(savoir));
            when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(savoirDTO);

            List<SavoirDTO> result = savoirService.searchSavoirs("essai");

            assertThat(result).hasSize(1);
            verify(savoirRepository).searchByKeyword("essai");
        }
    }
}