package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.dto.EvaluationEnseignantDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.repositories.EvaluationFormateurRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EvaluationFormateurServiceExtendedTest {

    @Mock
    private EvaluationFormateurRepository evaluationRepository;

    @InjectMocks
    private EvaluationFormateurService service;

    private EvaluationFormateur entity;
    private EvaluationFormateurDTO dto;

    @BeforeEach
    void setUp() {
        entity = new EvaluationFormateur();
        entity.setIdEvalParticipant(1L);
        entity.setEnseignantId("ens-001");
        entity.setFormationId(100L);
        entity.setNote(15.0f);
        entity.setSatisfaisant(true);
        entity.setCommentaire("Très bien");

        dto = new EvaluationFormateurDTO();
        dto.setEnseignantId("ens-001");
        dto.setFormationId(100L);
        dto.setNote(15.0f);
        dto.setSatisfaisant(true);
        dto.setCommentaire("Très bien");
    }

    @Test
    void ajouterEvalParticipant_shouldSaveAndReturn() {
        when(evaluationRepository.save(any())).thenReturn(entity);

        EvaluationFormateurDTO result = service.ajouterEvalParticipant(dto);

        assertNotNull(result);
        assertEquals(1L, result.getIdEvalParticipant());
        assertEquals("ens-001", result.getEnseignantId());
        verify(evaluationRepository).save(any());
    }

    @Test
    void modifierEvalParticipant_shouldUpdateAndReturn() {
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(evaluationRepository.save(any())).thenReturn(entity);

        EvaluationFormateurDTO updated = new EvaluationFormateurDTO();
        updated.setNote(18.0f);
        updated.setSatisfaisant(true);
        updated.setCommentaire("Excellent");
        updated.setEnseignantId("ens-001");
        updated.setFormationId(100L);

        EvaluationFormateurDTO result = service.modifierEvalParticipant(1L, updated);

        assertNotNull(result);
        verify(evaluationRepository).save(any());
    }

    @Test
    void modifierEvalParticipant_notFound_shouldThrow() {
        when(evaluationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.modifierEvalParticipant(999L, dto));
    }

    @Test
    void supprimerEvalParticipant_shouldCallDeleteById() {
        service.supprimerEvalParticipant(1L);
        verify(evaluationRepository).deleteById(1L);
    }

    @Test
    void consulterEvalParticipant_shouldReturnEntity() {
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        EvaluationFormateur result = service.consulterEvalParticipant(1L);

        assertNotNull(result);
        assertEquals(1L, result.getIdEvalParticipant());
    }

    @Test
    void consulterEvalParticipant_notFound_shouldThrow() {
        when(evaluationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.consulterEvalParticipant(999L));
    }

    @Test
    void getEvaluationDto_shouldReturnDto() {
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        EvaluationFormateurDTO result = service.getEvaluationDto(1L);

        assertNotNull(result);
        assertEquals("ens-001", result.getEnseignantId());
    }

    @Test
    void listAllEvaluationsDto_shouldReturnList() {
        when(evaluationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(entity)));

        Page<EvaluationFormateurDTO> result = service.listAllEvaluationsDto(Pageable.ofSize(10));

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
    }

    @Test
    void validerCompetences_noteAbove10_shouldSetSatisfaisant() {
        entity.setNote(12.0f);
        entity.setSatisfaisant(false);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        service.validerCompetences(1L);

        assertTrue(entity.isSatisfaisant());
        verify(evaluationRepository).save(entity);
    }

    @Test
    void validerCompetences_noteBelow10_shouldNotUpdate() {
        entity.setNote(5.0f);
        entity.setSatisfaisant(false);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        service.validerCompetences(1L);

        assertFalse(entity.isSatisfaisant());
        verify(evaluationRepository, never()).save(any());
    }

    @Test
    void createEvaluationsBulk_shouldSaveAll() {
        EvaluationFormateurDTO dto2 = new EvaluationFormateurDTO();
        dto2.setEnseignantId("ens-002");
        dto2.setFormationId(200L);
        dto2.setNote(14.0f);

        service.createEvaluationsBulk(Arrays.asList(dto, dto2));

        verify(evaluationRepository).saveAll(any());
    }

    @Test
    void listEvaluationsEnrichedByFormation_shouldReturnEnrichedDtos() {
        when(evaluationRepository.findByFormationId(100L)).thenReturn(List.of(entity));

        List<EvaluationEnseignantDTO> result = service.listEvaluationsEnrichedByFormation(100L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("ens-001", result.get(0).getEnseignantId());
        assertEquals(100L, result.get(0).getFormationId());
    }

    @Test
    void updateEvaluationsBulkByFormation_withDelete_shouldDeleteAndReturn() {
        EvaluationFormateur entityToDelete = new EvaluationFormateur();
        entityToDelete.setIdEvalParticipant(2L);
        entityToDelete.setEnseignantId("ens-to-delete");
        entityToDelete.setFormationId(100L);

        when(evaluationRepository.findByFormationId(100L)).thenReturn(Arrays.asList(entity, entityToDelete));

        // DTOs without "ens-to-delete"
        EvaluationFormateurDTO updateDto = new EvaluationFormateurDTO();
        updateDto.setEnseignantId("ens-001");
        updateDto.setNote(15.0f);

        service.updateEvaluationsBulkByFormation(100L, List.of(updateDto));

        verify(evaluationRepository).delete(entityToDelete);
        verify(evaluationRepository).save(any());
    }

    @Test
    void updateEvaluationsBulkByFormation_withExistingAndNew_shouldUpdateAndCreate() {
        when(evaluationRepository.findByFormationId(100L)).thenReturn(List.of(entity));
        when(evaluationRepository.save(any())).thenReturn(entity);

        // Update existing + add new
        EvaluationFormateurDTO updateDto = new EvaluationFormateurDTO();
        updateDto.setEnseignantId("ens-001");
        updateDto.setNote(19.0f);
        updateDto.setSatisfaisant(true);

        EvaluationFormateurDTO newDto = new EvaluationFormateurDTO();
        newDto.setEnseignantId("ens-new");
        newDto.setNote(16.0f);

        service.updateEvaluationsBulkByFormation(100L, List.of(updateDto, newDto));

        verify(evaluationRepository, atLeast(2)).save(any());
    }
}
