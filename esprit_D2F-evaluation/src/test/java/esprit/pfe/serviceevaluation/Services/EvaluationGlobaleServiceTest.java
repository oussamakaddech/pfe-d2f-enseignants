package esprit.pfe.serviceevaluation.Services;

import esprit.pfe.serviceevaluation.Entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.Repositories.EvaluationGlobaleRepository;
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

import java.time.LocalDate;
import java.util.ArrayList;
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
    private EvaluationGlobale evaluationGlobale2;

    @BeforeEach
    void setUp() {
        evaluationGlobale = EvaluationGlobale.builder()
                .id(1L)
                .formationId(1L)
                .noteGlobale(4.5)
                .commentaireGeneral("Formation très bénéfique")
                .recommandation("À recommander")
                .dateEvaluation(LocalDate.now())
                .build();

        evaluationGlobale2 = EvaluationGlobale.builder()
                .id(2L)
                .formationId(2L)
                .noteGlobale(3.8)
                .commentaireGeneral("Formation correcte")
                .recommandation("Peut être améliorée")
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

            EvaluationGlobale result = evaluationGlobaleService.createEvaluationGlobale(evaluationGlobale);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getFormationId()).isEqualTo(1L);
            assertThat(result.getNoteGlobale()).isEqualTo(4.5);
            verify(evaluationGlobaleRepository, times(1)).save(any(EvaluationGlobale.class));
        }

        @Test
        @DisplayName("lève une exception si une évaluation existe déjà pour cette formation")
        void shouldThrowExceptionWhenDuplicateEvaluation() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(true);

            assertThatThrownBy(() -> evaluationGlobaleService.createEvaluationGlobale(evaluationGlobale))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("évaluation globale existe déjà");
        }

        @Test
        @DisplayName("valide que la note est entre 0 et 5")
        void shouldValidateNoteRange() {
            EvaluationGlobale invalidEval = EvaluationGlobale.builder()
                    .id(3L)
                    .formationId(3L)
                    .noteGlobale(6.0) // invalide
                    .build();

            when(evaluationGlobaleRepository.existsByFormationId(3L)).thenReturn(false);
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class)))
                    .thenThrow(new IllegalArgumentException("Note invalide"));

            assertThatThrownBy(() -> evaluationGlobaleService.createEvaluationGlobale(invalidEval))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("invalide");
        }
    }

    @Nested
    @DisplayName("updateEvaluationGlobale()")
    class UpdateEvaluationGlobale {

        @Test
        @DisplayName("met à jour une évaluation existante")
        void shouldUpdateEvaluationGlobale() {
            EvaluationGlobale updated = EvaluationGlobale.builder()
                    .id(1L)
                    .formationId(1L)
                    .noteGlobale(5.0)
                    .commentaireGeneral("Excellent !")
                    .recommandation("À recommander vivement")
                    .dateEvaluation(LocalDate.now())
                    .build();

            when(evaluationGlobaleRepository.findById(1L)).thenReturn(Optional.of(evaluationGlobale));
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(updated);

            EvaluationGlobale result = evaluationGlobaleService.updateEvaluationGlobale(1L, updated);

            assertThat(result).isNotNull();
            assertThat(result.getNoteGlobale()).isEqualTo(5.0);
            assertThat(result.getCommentaireGeneral()).isEqualTo("Excellent !");
            verify(evaluationGlobaleRepository, times(1)).findById(1L);
            verify(evaluationGlobaleRepository, times(1)).save(any(EvaluationGlobale.class));
        }

        @Test
        @DisplayName("lève une exception si l'évaluation n'existe pas")
        void shouldThrowExceptionWhenNotFound() {
            when(evaluationGlobaleRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> evaluationGlobaleService.updateEvaluationGlobale(999L, evaluationGlobale))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
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

            EvaluationGlobale result = evaluationGlobaleService.getEvaluationGlobaleByFormationId(1L);

            assertThat(result).isNotNull();
            assertThat(result.getFormationId()).isEqualTo(1L);
            assertThat(result.getNoteGlobale()).isEqualTo(4.5);
            verify(evaluationGlobaleRepository, times(1)).findByFormationId(1L);
        }

        @Test
        @DisplayName("lève une exception si aucune évaluation n'existe")
        void shouldThrowExceptionWhenNotFound() {
            when(evaluationGlobaleRepository.findByFormationId(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> evaluationGlobaleService.getEvaluationGlobaleByFormationId(999L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
        }
    }

    @Nested
    @DisplayName("getAllEvaluationGlobales()")
    class GetAll {

        @Test
        @DisplayName("retourne toutes les évaluations globales")
        void shouldGetAllEvaluations() {
            List<EvaluationGlobale> evaluations = List.of(evaluationGlobale, evaluationGlobale2);
            when(evaluationGlobaleRepository.findAll()).thenReturn(evaluations);

            List<EvaluationGlobale> result = evaluationGlobaleService.getAllEvaluationGlobales();

            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
            assertThat(result).contains(evaluationGlobale, evaluationGlobale2);
            verify(evaluationGlobaleRepository, times(1)).findAll();
        }

        @Test
        @DisplayName("retourne une liste vide s'il n'y a pas d'évaluations")
        void shouldReturnEmptyList() {
            when(evaluationGlobaleRepository.findAll()).thenReturn(new ArrayList<>());

            List<EvaluationGlobale> result = evaluationGlobaleService.getAllEvaluationGlobales();

            assertThat(result).isNotNull();
            assertThat(result).isEmpty();
        }
    }
}
