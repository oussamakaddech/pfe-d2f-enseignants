package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.repositories.EvaluationFormateurRepository;
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
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EvaluationFormateurService - Tests unitaires")
class EvaluationFormateurServiceTest {

    @Mock
    private EvaluationFormateurRepository evaluationRepository;

    @Mock
    private esprit.pfe.serviceevaluation.client.FormationClient formationClient;

    @Mock
    private esprit.pfe.serviceevaluation.client.AuthClient authClient;

    @InjectMocks
    private EvaluationFormateurService evaluationService;

    private EvaluationFormateur entity;
    private EvaluationFormateurDTO dto;

    @BeforeEach
    void setUp() {
        entity = new EvaluationFormateur();
        entity.setIdEvalParticipant(1L);
        entity.setFormationId(10L);
        entity.setEnseignantId("ENS001");
        entity.setNote(15.0f);
        entity.setSatisfaisant(true);
        entity.setCommentaire("Bon formateur");

        dto = new EvaluationFormateurDTO();
        dto.setIdEvalParticipant(1L);
        dto.setFormationId(10L);
        dto.setEnseignantId("ENS001");
        dto.setNote(15.0f);
        dto.setSatisfaisant(true);
        dto.setCommentaire("Bon formateur");
    }

    @Nested
    @DisplayName("ajouterEvalParticipant()")
    class AjouterEval {

        @Test
        @DisplayName("crée une évaluation et retourne un DTO")
        void shouldCreateEvaluation() {
            when(evaluationRepository.save(any(EvaluationFormateur.class))).thenReturn(entity);

            EvaluationFormateurDTO result = evaluationService.ajouterEvalParticipant(dto);

            assertThat(result).isNotNull();
            assertThat(result.getEnseignantId()).isEqualTo("ENS001");
            assertThat(result.getNote()).isEqualTo(15.0f);
            verify(evaluationRepository, times(1)).save(any());
        }
    }

    @Nested
    @DisplayName("modifierEvalParticipant()")
    class ModifierEval {

        @Test
        @DisplayName("modifie une évaluation existante")
        void shouldModifyExisting() {
            EvaluationFormateur saved = new EvaluationFormateur();
            saved.setIdEvalParticipant(1L);
            saved.setNote(18.0f);
            saved.setSatisfaisant(true);
            saved.setCommentaire("Excellent");
            saved.setEnseignantId("ENS001");
            saved.setFormationId(10L);

            when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));
            when(evaluationRepository.save(any())).thenReturn(saved);

            EvaluationFormateurDTO updateDto = new EvaluationFormateurDTO();
            updateDto.setNote(18.0f);
            updateDto.setSatisfaisant(true);
            updateDto.setCommentaire("Excellent");
            updateDto.setEnseignantId("ENS001");
            updateDto.setFormationId(10L);

            EvaluationFormateurDTO result = evaluationService.modifierEvalParticipant(1L, updateDto);

            assertThat(result.getNote()).isEqualTo(18.0f);
            assertThat(result.getCommentaire()).isEqualTo("Excellent");
            verify(evaluationRepository).findById(1L);
            verify(evaluationRepository).save(any());
        }

        @Test
        @DisplayName("lève RuntimeException si non trouvée")
        void shouldThrowWhenNotFound() {
            when(evaluationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> evaluationService.modifierEvalParticipant(999L, dto))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
        }
    }

    @Nested
    @DisplayName("consulterEvalParticipant()")
    class ConsulterEval {

        @Test
        @DisplayName("retourne l'entité si trouvée")
        void shouldReturnEntity() {
            when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

            EvaluationFormateur result = evaluationService.consulterEvalParticipant(1L);

            assertThat(result).isNotNull();
            assertThat(result.getIdEvalParticipant()).isEqualTo(1L);
        }

        @Test
        @DisplayName("lève RuntimeException si non trouvée")
        void shouldThrowWhenNotFound() {
            when(evaluationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> evaluationService.consulterEvalParticipant(999L))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    @Nested
    @DisplayName("validerCompetences()")
    class ValiderCompetences {

        @Test
        @DisplayName("met satisfaisant=true si note >= 10")
        void shouldSetSatisfaisantWhenNoteAbove10() {
            entity.setNote(12.0f);
            entity.setSatisfaisant(false);
            when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));
            when(evaluationRepository.save(any())).thenReturn(entity);

            evaluationService.validerCompetences(1L);

            assertThat(entity.isSatisfaisant()).isTrue();
            verify(evaluationRepository).save(entity);
        }

        @Test
        @DisplayName("ne modifie pas si note < 10")
        void shouldNotSetSatisfaisantWhenNoteBelow10() {
            entity.setNote(5.0f);
            entity.setSatisfaisant(false);
            when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

            evaluationService.validerCompetences(1L);

            assertThat(entity.isSatisfaisant()).isFalse();
            verify(evaluationRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("listAllEvaluationsDto()")
    class ListAll {

        @Test
        @DisplayName("retourne la liste mappée en DTOs")
        void shouldReturnDtoList() {
            when(evaluationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(entity)));

            Page<EvaluationFormateurDTO> result = evaluationService.listAllEvaluationsDto(Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            assertThat(result.getContent().get(0).getEnseignantId()).isEqualTo("ENS001");
        }

        @Test
        @DisplayName("retourne une liste vide")
        void shouldReturnEmptyList() {
            when(evaluationRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());

            Page<EvaluationFormateurDTO> result = evaluationService.listAllEvaluationsDto(Pageable.ofSize(10));

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("createEvaluationsBulk()")
    class BulkCreate {

        @Test
        @DisplayName("sauvegarde une liste d'évaluations")
        void shouldSaveBulk() {
            List<EvaluationFormateurDTO> dtos = List.of(dto);

            evaluationService.createEvaluationsBulk(dtos);

            verify(evaluationRepository).saveAll(anyList());
        }
    }
}
