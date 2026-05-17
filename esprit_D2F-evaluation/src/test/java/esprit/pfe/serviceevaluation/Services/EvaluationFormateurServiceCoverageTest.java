package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.client.AuthClient;
import esprit.pfe.serviceevaluation.client.FormationClient;
import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.exception.ResourceNotFoundException;
import esprit.pfe.serviceevaluation.repositories.EvaluationFormateurRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EvaluationFormateurService - Tests couverture complète")
class EvaluationFormateurServiceCoverageTest {

    @Mock
    private EvaluationFormateurRepository evaluationRepository;

    @Mock
    private FormationClient formationClient;

    @Mock
    private AuthClient authClient;

    @InjectMocks
    private EvaluationFormateurService service;

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

    @Test
    @DisplayName("ajouterEvalParticipant - with valid clients - should save successfully")
    void ajouterEvalParticipant_ValidClients_ShouldSave() {
        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(true);
        when(evaluationRepository.save(any(EvaluationFormateur.class))).thenReturn(entity);

        EvaluationFormateurDTO result = service.ajouterEvalParticipant(dto);

        assertNotNull(result);
        assertEquals("ENS001", result.getEnseignantId());
        verify(formationClient).getFormation(10L);
        verify(authClient).getEnseignant("ENS001");
        verify(evaluationRepository).save(any(EvaluationFormateur.class));
    }

    @Test
    @DisplayName("ajouterEvalParticipant - formation not found - should throw ResourceNotFoundException")
    void ajouterEvalParticipant_FormationNotFound_ShouldThrow() {
        when(formationClient.getFormation(10L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.ajouterEvalParticipant(dto));
        verify(authClient, never()).getEnseignant(anyString());
    }

    @Test
    @DisplayName("ajouterEvalParticipant - enseignant not found - should throw ResourceNotFoundException")
    void ajouterEvalParticipant_EnseignantNotFound_ShouldThrow() {
        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.ajouterEvalParticipant(dto));
        verify(evaluationRepository, never()).save(any());
    }

    @Test
    @DisplayName("modifierEvalParticipant - with valid data - should update successfully")
    void modifierEvalParticipant_ValidData_ShouldUpdate() {
        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(true);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(evaluationRepository.save(any(EvaluationFormateur.class))).thenReturn(entity);

        EvaluationFormateurDTO updateDto = new EvaluationFormateurDTO();
        updateDto.setFormationId(10L);
        updateDto.setEnseignantId("ENS001");
        updateDto.setNote(18.0f);
        updateDto.setSatisfaisant(false);
        updateDto.setCommentaire("Updated comment");

        EvaluationFormateurDTO result = service.modifierEvalParticipant(1L, updateDto);

        assertNotNull(result);
        verify(formationClient).getFormation(10L);
        verify(authClient).getEnseignant("ENS001");
        verify(evaluationRepository).save(any(EvaluationFormateur.class));
    }

    @Test
    @DisplayName("modifierEvalParticipant - evaluation not found - should throw RuntimeException")
    void modifierEvalParticipant_EvaluationNotFound_ShouldThrow() {
        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(true);
        when(evaluationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.modifierEvalParticipant(999L, dto));
        verify(evaluationRepository, never()).save(any());
    }

    @Test
    @DisplayName("modifierEvalParticipant - formation not found - should throw ResourceNotFoundException")
    void modifierEvalParticipant_FormationNotFound_ShouldThrow() {
        when(formationClient.getFormation(10L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.modifierEvalParticipant(1L, dto));
        verify(evaluationRepository, never()).findById(anyLong());
    }

    @Test
    @DisplayName("validerCompetences - note >= 10 - should mark as satisfaisant")
    void validerCompetences_NoteAbove10_ShouldMarkSatisfaisant() {
        entity.setNote(10.0f);
        entity.setSatisfaisant(false);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        service.validerCompetences(1L);

        assertTrue(entity.isSatisfaisant());
        verify(evaluationRepository).save(entity);
    }

    @Test
    @DisplayName("validerCompetences - note < 10 - should not mark as satisfaisant")
    void validerCompetences_NoteBelow10_ShouldNotMark() {
        entity.setNote(9.9f);
        entity.setSatisfaisant(false);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        service.validerCompetences(1L);

        assertFalse(entity.isSatisfaisant());
        verify(evaluationRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvaluationsBulk - empty list - should not verify existence")
    void createEvaluationsBulk_EmptyList_ShouldNotVerify() {
        service.createEvaluationsBulk(List.of());

        verify(formationClient, never()).getFormation(anyLong());
        verify(authClient, never()).getEnseignant(anyString());
        verify(evaluationRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("createEvaluationsBulk - with valid data - should save all")
    void createEvaluationsBulk_ValidData_ShouldSaveAll() {
        EvaluationFormateurDTO dto2 = new EvaluationFormateurDTO();
        dto2.setEnseignantId("ENS002");
        dto2.setFormationId(10L);
        dto2.setNote(14.0f);

        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(true);

        service.createEvaluationsBulk(Arrays.asList(dto, dto2));

        verify(formationClient).getFormation(10L);
        verify(authClient).getEnseignant("ENS001");
        verify(evaluationRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("createEvaluationsBulk - formation not found - should throw ResourceNotFoundException")
    void createEvaluationsBulk_FormationNotFound_ShouldThrow() {
        when(formationClient.getFormation(10L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.createEvaluationsBulk(Arrays.asList(dto)));
        verify(evaluationRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("updateEvaluationsBulkByFormation - empty list - should not verify")
    void updateEvaluationsBulkByFormation_EmptyList_ShouldNotVerify() {
        service.updateEvaluationsBulkByFormation(10L, List.of());

        verify(formationClient, never()).getFormation(anyLong());
        verify(authClient, never()).getEnseignant(anyString());
    }

    @Test
    @DisplayName("updateEvaluationsBulkByFormation - create new - should save new evaluation")
    void updateEvaluationsBulkByFormation_CreateNew_ShouldSave() {
        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(true);
        when(evaluationRepository.findByFormationId(10L)).thenReturn(List.of());

        EvaluationFormateurDTO newDto = new EvaluationFormateurDTO();
        newDto.setEnseignantId("ENS001");
        newDto.setFormationId(10L);
        newDto.setNote(15.0f);

        service.updateEvaluationsBulkByFormation(10L, List.of(newDto));

        verify(evaluationRepository).findByFormationId(10L);
        verify(evaluationRepository).save(any(EvaluationFormateur.class));
    }

    @Test
    @DisplayName("updateEvaluationsBulkByFormation - update existing - should update")
    void updateEvaluationsBulkByFormation_UpdateExisting_ShouldUpdate() {
        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(true);
        when(evaluationRepository.findByFormationId(10L)).thenReturn(List.of(entity));

        EvaluationFormateurDTO updateDto = new EvaluationFormateurDTO();
        updateDto.setEnseignantId("ENS001");
        updateDto.setFormationId(10L);
        updateDto.setNote(18.0f);
        updateDto.setCommentaire("Updated");

        service.updateEvaluationsBulkByFormation(10L, List.of(updateDto));

        verify(evaluationRepository).save(any(EvaluationFormateur.class));
        verify(evaluationRepository, never()).delete(any());
    }

    @Test
    @DisplayName("updateEvaluationsBulkByFormation - delete old - should delete removed evaluations")
    void updateEvaluationsBulkByFormation_DeleteOld_ShouldDelete() {
        EvaluationFormateur oldEntity = new EvaluationFormateur();
        oldEntity.setIdEvalParticipant(2L);
        oldEntity.setEnseignantId("ENS002");
        oldEntity.setFormationId(10L);

        when(formationClient.getFormation(10L)).thenReturn(true);
        when(authClient.getEnseignant("ENS001")).thenReturn(true);
        when(evaluationRepository.findByFormationId(10L)).thenReturn(Arrays.asList(entity, oldEntity));

        EvaluationFormateurDTO updateDto = new EvaluationFormateurDTO();
        updateDto.setEnseignantId("ENS001");
        updateDto.setFormationId(10L);

        service.updateEvaluationsBulkByFormation(10L, List.of(updateDto));

        verify(evaluationRepository).delete(oldEntity);
    }

    @Test
    @DisplayName("updateEvaluationsBulkByFormation - formation not found - should throw")
    void updateEvaluationsBulkByFormation_FormationNotFound_ShouldThrow() {
        when(formationClient.getFormation(10L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.updateEvaluationsBulkByFormation(10L, List.of(dto)));
        verify(evaluationRepository, never()).findByFormationId(anyLong());
    }

    @Test
    @DisplayName("mapToDto and mapToEntity - bidirectional mapping")
    void mappingBidirectional_ShouldPreserveData() {
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(entity));

        // Test mapToDto through getEvaluationDto
        EvaluationFormateurDTO resultDto = service.getEvaluationDto(1L);

        assertEquals(entity.getIdEvalParticipant(), resultDto.getIdEvalParticipant());
        assertEquals(entity.getEnseignantId(), resultDto.getEnseignantId());
        assertEquals(entity.getFormationId(), resultDto.getFormationId());
        assertEquals(entity.getNote(), resultDto.getNote());
        assertEquals(entity.isSatisfaisant(), resultDto.isSatisfaisant());
        assertEquals(entity.getCommentaire(), resultDto.getCommentaire());
    }
}
