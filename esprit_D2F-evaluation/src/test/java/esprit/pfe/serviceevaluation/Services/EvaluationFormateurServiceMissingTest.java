package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationEnseignantDTO;
import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.repositories.EvaluationFormateurRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EvaluationFormateurService - Tests d'absence")
class EvaluationFormateurServiceMissingTest {

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

        lenient().when(authClient.enseignantExists(anyString())).thenReturn(true);
    }

    @Test
    @DisplayName("supprimerEvalParticipant() - supprime une évaluation")
    void shouldDeleteEvaluation() {
        // Given
        doNothing().when(evaluationRepository).deleteById(anyLong());

        // When
        evaluationService.supprimerEvalParticipant(1L);

        // Then
        verify(evaluationRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("getEvaluationDto() - retourne un DTO")
    void shouldGetEvaluationDto() {
        // Given
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        // When
        EvaluationFormateurDTO result = evaluationService.getEvaluationDto(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEnseignantId()).isEqualTo("ENS001");
        verify(evaluationRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("listEvaluationsEnrichedByFormation() - retourne la liste enrichie")
    void shouldListEvaluationsEnrichedByFormation() {
        // Given
        List<EvaluationFormateur> evaluations = Arrays.asList(entity);
        when(evaluationRepository.findByFormationId(10L)).thenReturn(evaluations);

        // When
        List<EvaluationEnseignantDTO> result = evaluationService.listEvaluationsEnrichedByFormation(10L);

        // Then
        assertThat(result).isNotNull()
                .hasSize(1);
        assertThat(result.get(0).getEnseignantId()).isEqualTo("ENS001");
    }

    @Test
    @DisplayName("updateEvaluationsBulkByFormation() - met à jour en masse")
    void shouldUpdateEvaluationsBulkByFormation() {
        // Given
        List<EvaluationFormateurDTO> dtos = Arrays.asList(dto);
        List<EvaluationFormateur> evaluations = Arrays.asList(entity);
        when(evaluationRepository.findByFormationId(10L)).thenReturn(evaluations);

        // When
        evaluationService.updateEvaluationsBulkByFormation(10L, dtos);

        // Then
        verify(evaluationRepository, times(1)).findByFormationId(10L);
        verify(evaluationRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("validerCompetences() - ne modifie pas si note < 10")
    void shouldNotModifySatisfaisantWhenNoteBelow10() {
        // Given
        entity.setNote(5.0f);
        entity.setSatisfaisant(false);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        // When
        evaluationService.validerCompetences(1L);

        // Then
        verify(evaluationRepository, never()).save(any());
    }

    @Test
    @DisplayName("validerCompetences() - met satisfaisant=true si note >= 10")
    void shouldSetSatisfaisantWhenNoteAbove10() {
        // Given
        entity.setNote(12.0f);
        entity.setSatisfaisant(false);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(evaluationRepository.save(any())).thenReturn(entity);

        // When
        evaluationService.validerCompetences(1L);

        // Then
        verify(evaluationRepository, times(1)).save(entity);
    }

    @Test
    @DisplayName("modifierEvalParticipant() - lève RuntimeException si non trouvée")
    void shouldThrowWhenEvaluationNotFound() {
        // Given
        when(evaluationRepository.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> evaluationService.modifierEvalParticipant(999L, dto))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("non trouvée");
    }

    @Test
    @DisplayName("modifierEvalParticipant() - modifie une évaluation existante")
    void shouldModifyExistingEvaluation() {
        // Given
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

        // When
        EvaluationFormateurDTO result = evaluationService.modifierEvalParticipant(1L, updateDto);

        // Then
        assertThat(result)
                .extracting(EvaluationFormateurDTO::getNote, EvaluationFormateurDTO::getCommentaire)
                .containsExactly(18.0f, "Excellent");
        verify(evaluationRepository).findById(1L);
        verify(evaluationRepository).save(any());
    }

    @Test
    @DisplayName("createEvaluationsBulk() - sauvegarde une liste d'évaluations")
    void shouldSaveBulkEvaluations() {
        // Given
        List<EvaluationFormateurDTO> dtos = Arrays.asList(dto);

        // When
        evaluationService.createEvaluationsBulk(dtos);

        // Then
        verify(evaluationRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("listAllEvaluationsDto() - retourne une liste paginée")
    void shouldReturnPagedEvaluations() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        when(evaluationRepository.findAll(pageable)).thenReturn(new PageImpl<>(Arrays.asList(entity)));

        // When
        Page<EvaluationFormateurDTO> result = evaluationService.listAllEvaluationsDto(pageable);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.getContent().get(0).getEnseignantId()).isEqualTo("ENS001");
    }
}