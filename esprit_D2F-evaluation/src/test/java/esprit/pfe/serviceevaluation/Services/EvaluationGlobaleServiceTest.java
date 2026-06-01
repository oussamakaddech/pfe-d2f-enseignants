package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EvaluationGlobaleService - Tests unitaires")
class EvaluationGlobaleServiceTest {

    @Mock
    private EvaluationGlobaleRepository evaluationGlobaleRepository;

    @InjectMocks
    private EvaluationGlobaleService evaluationGlobaleService;

    private EvaluationGlobale evaluationGlobale;
    private EvaluationGlobaleDTO evaluationGlobaleDTO;

    @BeforeEach
    void setUp() {
        evaluationGlobale = EvaluationGlobale.builder()
                .idEvalGlobale(1L)
                .formationId(1L)
                .noteGlobale(4.5f)
                .commentaireGeneral("Formation très bénéfique")
                .recommandation("À recommander")
                .dateEvaluation(LocalDate.now())
                .build();

        evaluationGlobaleDTO = EvaluationGlobaleDTO.builder()
                .idEvalGlobale(1L)
                .formationId(1L)
                .noteGlobale(4.5f)
                .commentaireGeneral("Formation très bénéfique")
                .recommandation("À recommander")
                .dateEvaluation(LocalDate.now())
                .build();
    }

    @Nested
    @DisplayName("createEvaluationGlobale()")
    class CreateEvaluationGlobale {

        @Test
        @DisplayName("crée une évaluation globale valide")
        void shouldCreateEvaluationGlobale() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(false);
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(evaluationGlobale);

            EvaluationGlobaleDTO result = evaluationGlobaleService.createEvaluationGlobale(evaluationGlobaleDTO);

            assertThat(result)
                    .isNotNull()
                    .satisfies(r -> {
                        assertThat(r.getIdEvalGlobale()).isEqualTo(1L);
                        assertThat(r.getFormationId()).isEqualTo(1L);
                        assertThat(r.getNoteGlobale()).isEqualTo(4.5f);
                    });
            verify(evaluationGlobaleRepository, times(1)).save(any(EvaluationGlobale.class));
        }

        @Test
        @DisplayName("lève une exception si une évaluation existe déjà pour cette formation")
        void shouldThrowExceptionWhenDuplicateEvaluation() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(true);

            assertThatThrownBy(() -> evaluationGlobaleService.createEvaluationGlobale(evaluationGlobaleDTO))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("évaluation globale existe déjà");
        }
    }

    @Nested
    @DisplayName("updateEvaluationGlobale()")
    class UpdateEvaluationGlobale {

        @Test
        @DisplayName("met à jour une évaluation existante")
        void shouldUpdateEvaluationGlobale() {
            EvaluationGlobaleDTO updateRequest = EvaluationGlobaleDTO.builder()
                    .noteGlobale(5.0f)
                    .commentaireGeneral("Excellent !")
                    .recommandation("À recommander vivement")
                    .dateEvaluation(LocalDate.now())
                    .build();

            EvaluationGlobale updatedEntity = EvaluationGlobale.builder()
                    .idEvalGlobale(1L)
                    .formationId(1L)
                    .noteGlobale(5.0f)
                    .commentaireGeneral("Excellent !")
                    .recommandation("À recommander vivement")
                    .dateEvaluation(LocalDate.now())
                    .build();

            when(evaluationGlobaleRepository.findById(1L)).thenReturn(Optional.of(evaluationGlobale));
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(updatedEntity);

            EvaluationGlobaleDTO result = evaluationGlobaleService.updateEvaluationGlobale(1L, updateRequest);

            assertThat(result)
                    .isNotNull()
                    .satisfies(r -> {
                        assertThat(r.getNoteGlobale()).isEqualTo(5.0f);
                        assertThat(r.getCommentaireGeneral()).isEqualTo("Excellent !");
                    });
            verify(evaluationGlobaleRepository, times(1)).findById(1L);
            verify(evaluationGlobaleRepository, times(1)).save(any(EvaluationGlobale.class));
        }
    }

    @Nested
    @DisplayName("deleteEvaluationGlobale()")
    class DeleteEvaluationGlobale {

        @Test
        @DisplayName("supprime une évaluation par id")
        void shouldDeleteEvaluationGlobale() {
            doNothing().when(evaluationGlobaleRepository).deleteById(1L);

            evaluationGlobaleService.deleteEvaluationGlobale(1L);

            verify(evaluationGlobaleRepository, times(1)).deleteById(1L);
        }
    }

    @Nested
    @DisplayName("getEvaluationGlobaleByFormationId()")
    class GetByFormationId {

        @Test
        @DisplayName("retourne l'évaluation globale d'une formation")
        void shouldGetByFormationId() {
            when(evaluationGlobaleRepository.findByFormationId(1L)).thenReturn(Optional.of(evaluationGlobale));

            EvaluationGlobaleDTO result = evaluationGlobaleService.getEvaluationGlobaleByFormationId(1L);

            assertThat(result)
                    .isNotNull()
                    .satisfies(r -> {
                        assertThat(r.getFormationId()).isEqualTo(1L);
                        assertThat(r.getNoteGlobale()).isEqualTo(4.5f);
                    });
            verify(evaluationGlobaleRepository, times(1)).findByFormationId(1L);
        }
    }

    @Nested
    @DisplayName("getAllEvaluationGlobales()")
    class GetAll {

        @Test
        @DisplayName("retourne toutes les évaluations globales")
        void shouldGetAllEvaluations() {
            Page<EvaluationGlobale> evaluations = new PageImpl<>(List.of(evaluationGlobale));
            when(evaluationGlobaleRepository.findAll(any(Pageable.class))).thenReturn(evaluations);

            Page<EvaluationGlobaleDTO> result = evaluationGlobaleService.getAllEvaluationGlobales(Pageable.ofSize(10));

            assertThat(result)
                    .isNotNull()
                    .hasSize(1);
            verify(evaluationGlobaleRepository, times(1)).findAll(any(Pageable.class));
        }
    }
}
