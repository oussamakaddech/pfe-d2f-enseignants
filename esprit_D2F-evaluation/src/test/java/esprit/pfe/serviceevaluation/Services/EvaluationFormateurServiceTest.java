package esprit.pfe.serviceevaluation.Services;

import esprit.pfe.serviceevaluation.Entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.Repositories.EvaluationFormateurRepository;
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
@DisplayName("EvaluationFormateurService - Tests unitaires")
class EvaluationFormateurServiceTest {

    @Mock
    private EvaluationFormateurRepository evaluationFormateurRepository;

    @InjectMocks
    private EvaluationFormateurService evaluationFormateurService;

    private EvaluationFormateur evaluationFormateur;
    private EvaluationFormateur evaluationFormateur2;

    @BeforeEach
    void setUp() {
        evaluationFormateur = EvaluationFormateur.builder()
                .id(1L)
                .formationId(1L)
                .enseignantId("ENS001")
                .note(4.5)
                .satisfaisant(true)
                .commentaire("Le formateur était très compétent")
                .dateEvaluation(LocalDate.now())
                .build();

        evaluationFormateur2 = EvaluationFormateur.builder()
                .id(2L)
                .formationId(1L)
                .enseignantId("ENS002")
                .note(3.8)
                .satisfaisant(true)
                .commentaire("Bon contenu mais manque d'interactivité")
                .dateEvaluation(LocalDate.now())
                .build();
    }

    @Nested
    @DisplayName("ajouterEvalParticipant()")
    class AjouterEvaluation {

        @Test
        @DisplayName("ajoute une évaluation formateur valide")
        void shouldAddValidEvaluation() {
            when(evaluationFormateurRepository.save(any(EvaluationFormateur.class))).thenReturn(evaluationFormateur);

            EvaluationFormateur result = evaluationFormateurService.ajouterEvalParticipant(evaluationFormateur);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getFormationId()).isEqualTo(1L);
            assertThat(result.getEnseignantId()).isEqualTo("ENS001");
            assertThat(result.getNote()).isEqualTo(4.5);
            assertThat(result.isSatisfaisant()).isTrue();
            verify(evaluationFormateurRepository, times(1)).save(any(EvaluationFormateur.class));
        }

        @Test
        @DisplayName("valide que la note est entre 0 et 5")
        void shouldValidateNoteRange() {
            EvaluationFormateur invalidEval = EvaluationFormateur.builder()
                    .id(3L)
                    .formationId(2L)
                    .enseignantId("ENS003")
                    .note(6.0) // invalide
                    .build();

            when(evaluationFormateurRepository.save(any(EvaluationFormateur.class)))
                    .thenThrow(new IllegalArgumentException("Note invalide"));

            assertThatThrownBy(() -> evaluationFormateurService.ajouterEvalParticipant(invalidEval))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("invalide");
        }

        @Test
        @DisplayName("accepte une note faible avec satisfaisant=false")
        void shouldAcceptLowNoteWithSatisfaisantFalse() {
            EvaluationFormateur lowEval = EvaluationFormateur.builder()
                    .id(4L)
                    .formationId(3L)
                    .enseignantId("ENS004")
                    .note(2.0)
                    .satisfaisant(false)
                    .commentaire("Formation non satisfaisante")
                    .build();

            when(evaluationFormateurRepository.save(any(EvaluationFormateur.class))).thenReturn(lowEval);

            EvaluationFormateur result = evaluationFormateurService.ajouterEvalParticipant(lowEval);

            assertThat(result).isNotNull();
            assertThat(result.getNote()).isEqualTo(2.0);
            assertThat(result.isSatisfaisant()).isFalse();
        }
    }

    @Nested
    @DisplayName("modifierEvalParticipant()")
    class ModifierEvaluation {

        @Test
        @DisplayName("modifie une évaluation existante")
        void shouldModifyEvaluation() {
            EvaluationFormateur updated = EvaluationFormateur.builder()
                    .id(1L)
                    .formationId(1L)
                    .enseignantId("ENS001")
                    .note(5.0)
                    .satisfaisant(true)
                    .commentaire("Excellent formateur !")
                    .dateEvaluation(LocalDate.now())
                    .build();

            when(evaluationFormateurRepository.findById(1L)).thenReturn(Optional.of(evaluationFormateur));
            when(evaluationFormateurRepository.save(any(EvaluationFormateur.class))).thenReturn(updated);

            EvaluationFormateur result = evaluationFormateurService.modifierEvalParticipant(1L, updated);

            assertThat(result).isNotNull();
            assertThat(result.getNote()).isEqualTo(5.0);
            assertThat(result.getCommentaire()).isEqualTo("Excellent formateur !");
            verify(evaluationFormateurRepository, times(1)).findById(1L);
            verify(evaluationFormateurRepository, times(1)).save(any(EvaluationFormateur.class));
        }

        @Test
        @DisplayName("lève une exception si l'évaluation n'existe pas")
        void shouldThrowExceptionWhenNotFound() {
            when(evaluationFormateurRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> evaluationFormateurService.modifierEvalParticipant(999L, evaluationFormateur))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
        }
    }

    @Nested
    @DisplayName("supprimerEvalParticipant()")
    class SupprimerEvaluation {

        @Test
        @DisplayName("supprime une évaluation par id")
        void shouldDeleteEvaluation() {
            doNothing().when(evaluationFormateurRepository).deleteById(1L);

            evaluationFormateurService.supprimerEvalParticipant(1L);

            verify(evaluationFormateurRepository, times(1)).deleteById(1L);
        }
    }

    @Nested
    @DisplayName("consulterEvalParticipant()")
    class ConsulterEvaluation {

        @Test
        @DisplayName("récupère une évaluation par id")
        void shouldGetEvaluationById() {
            when(evaluationFormateurRepository.findById(1L)).thenReturn(Optional.of(evaluationFormateur));

            EvaluationFormateur result = evaluationFormateurService.consulterEvalParticipant(1L);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getNote()).isEqualTo(4.5);
            verify(evaluationFormateurRepository, times(1)).findById(1L);
        }

        @Test
        @DisplayName("lève une exception si l'évaluation n'existe pas")
        void shouldThrowExceptionWhenNotFound() {
            when(evaluationFormateurRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> evaluationFormateurService.consulterEvalParticipant(999L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
        }
    }

    @Nested
    @DisplayName("listerEvalParFormation()")
    class ListerEval {

        @Test
        @DisplayName("retourne toutes les évaluations d'une formation")
        void shouldListEvaluationsByFormation() {
            List<EvaluationFormateur> evaluations = List.of(evaluationFormateur, evaluationFormateur2);
            when(evaluationFormateurRepository.findByFormationId(1L)).thenReturn(evaluations);

            List<EvaluationFormateur> result = evaluationFormateurService.listerEvalParFormation(1L);

            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
            assertThat(result).contains(evaluationFormateur, evaluationFormateur2);
            verify(evaluationFormateurRepository, times(1)).findByFormationId(1L);
        }

        @Test
        @DisplayName("retourne une liste vide s'il n'y a pas d'évaluations")
        void shouldReturnEmptyList() {
            when(evaluationFormateurRepository.findByFormationId(999L)).thenReturn(new ArrayList<>());

            List<EvaluationFormateur> result = evaluationFormateurService.listerEvalParFormation(999L);

            assertThat(result).isNotNull();
            assertThat(result).isEmpty();
        }
    }
}
