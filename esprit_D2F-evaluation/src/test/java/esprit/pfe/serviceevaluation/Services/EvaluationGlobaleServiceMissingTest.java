package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;


import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EvaluationGlobaleService - Tests d'absence")
class EvaluationGlobaleServiceMissingTest {

    @Mock
    private EvaluationGlobaleRepository evaluationRepository;

    @InjectMocks
    private EvaluationGlobaleService evaluationService;

    private EvaluationGlobale entity;
    private EvaluationGlobaleDTO dto;

    @BeforeEach
    void setUp() {
        entity = new EvaluationGlobale();
        entity.setIdEvalGlobale(1L);
        entity.setFormationId(10L);
        entity.setCommentaireGeneral("Evaluation générale");
        entity.setDateEvaluation(LocalDate.now());
        entity.setNoteGlobale(15.0f);
        entity.setRecommandation("Bon travail");

        dto = new EvaluationGlobaleDTO();
        dto.setIdEvalGlobale(1L);
        dto.setFormationId(10L);
        dto.setCommentaireGeneral("Evaluation générale");
        dto.setDateEvaluation(LocalDate.now());
        dto.setNoteGlobale(15.0f);
        dto.setRecommandation("Bon travail");
    }

    @Test
    @DisplayName("createEvaluationGlobale() - crée une évaluation globale")
    void shouldCreateEvaluationGlobale() {
        // Given
        when(evaluationRepository.existsByFormationId(10L)).thenReturn(false);
        when(evaluationRepository.save(any(EvaluationGlobale.class))).thenReturn(entity);

        // When
        EvaluationGlobaleDTO result = evaluationService.createEvaluationGlobale(dto);

        // Then
        assertThat(result).isNotNull();
        verify(evaluationRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("updateEvaluationGlobale() - met à jour une évaluation globale")
    void shouldUpdateEvaluationGlobale() {
        // Given
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(evaluationRepository.save(any())).thenReturn(entity);

        // When
        EvaluationGlobaleDTO result = evaluationService.updateEvaluationGlobale(1L, dto);

        // Then
        assertThat(result).isNotNull();
        verify(evaluationRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("deleteEvaluationGlobale() - supprime une évaluation")
    void shouldDeleteEvaluationGlobale() {
        // Given
        doNothing().when(evaluationRepository).deleteById(anyLong());

        // When
        evaluationService.deleteEvaluationGlobale(1L);

        // Then
        verify(evaluationRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("getEvaluationGlobaleById() - retourne une évaluation par ID")
    void shouldGetEvaluationGlobaleById() {
        // Given
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        // When
        EvaluationGlobaleDTO result = evaluationService.getEvaluationGlobaleById(1L);

        // Then
        assertThat(result).isNotNull();
        verify(evaluationRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("getEvaluationGlobaleByFormationId() - retourne une évaluation par formation ID")
    void shouldGetEvaluationGlobaleByFormationId() {
        // Given
        when(evaluationRepository.findByFormationId(10L)).thenReturn(Optional.of(entity));

        // When
        EvaluationGlobaleDTO result = evaluationService.getEvaluationGlobaleByFormationId(10L);

        // Then
        assertThat(result).isNotNull();
        verify(evaluationRepository, times(1)).findByFormationId(10L);
    }

    @Test
    @DisplayName("getAllEvaluationGlobales() - retourne une liste paginée")
    void shouldGetAllEvaluationGlobales() {
        // Given
        when(evaluationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(Arrays.asList(entity)));

        // When
        Page<EvaluationGlobaleDTO> result = evaluationService.getAllEvaluationGlobales(Pageable.ofSize(10));

        // Then
        assertThat(result).isNotNull()
                .hasSize(1);
    }
}