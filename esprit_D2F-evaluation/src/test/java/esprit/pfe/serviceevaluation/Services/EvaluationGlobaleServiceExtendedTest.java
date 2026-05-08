package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EvaluationGlobaleServiceExtendedTest {

    @Mock
    private EvaluationGlobaleRepository repository;
    @InjectMocks
    private EvaluationGlobaleService service;

    private EvaluationGlobale entity;
    private EvaluationGlobaleDTO dto;

    @BeforeEach
    void setUp() {
        entity = new EvaluationGlobale();
        entity.setIdEvalGlobale(1L);
        entity.setFormationId(100L);
        entity.setCommentaireGeneral("Bonne formation");
        entity.setNoteGlobale(4.5f);
        entity.setRecommandation("Recommandée");

        dto = new EvaluationGlobaleDTO();
        dto.setFormationId(100L);
        dto.setCommentaireGeneral("Bonne formation");
        dto.setNoteGlobale(4.5f);
        dto.setRecommandation("Recommandée");
    }

    @Test
    void createEvaluationGlobale_new_shouldSaveAndReturn() {
        when(repository.existsByFormationId(100L)).thenReturn(false);
        when(repository.save(any())).thenReturn(entity);

        EvaluationGlobaleDTO result = service.createEvaluationGlobale(dto);

        assertNotNull(result);
        assertEquals(1L, result.getIdEvalGlobale());
        verify(repository).save(any());
    }

    @Test
    void createEvaluationGlobale_duplicate_shouldThrow() {
        when(repository.existsByFormationId(100L)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.createEvaluationGlobale(dto));
        verify(repository, never()).save(any());
    }

    @Test
    void updateEvaluationGlobale_shouldUpdate() {
        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.save(any())).thenReturn(entity);

        EvaluationGlobaleDTO updated = new EvaluationGlobaleDTO();
        updated.setNoteGlobale(5.0f);
        updated.setCommentaireGeneral("Excellente");
        updated.setRecommandation("Fortement recommandée");

        EvaluationGlobaleDTO result = service.updateEvaluationGlobale(1L, updated);

        assertNotNull(result);
        verify(repository).save(any());
    }

    @Test
    void updateEvaluationGlobale_notFound_shouldThrow() {
        when(repository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.updateEvaluationGlobale(999L, dto));
    }

    @Test
    void deleteEvaluationGlobale_shouldDelegate() {
        service.deleteEvaluationGlobale(1L);
        verify(repository).deleteById(1L);
    }

    @Test
    void getEvaluationGlobaleById_found_shouldReturn() {
        when(repository.findById(1L)).thenReturn(Optional.of(entity));

        EvaluationGlobaleDTO result = service.getEvaluationGlobaleById(1L);

        assertNotNull(result);
        assertEquals(100L, result.getFormationId());
    }

    @Test
    void getEvaluationGlobaleById_notFound_shouldThrow() {
        when(repository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.getEvaluationGlobaleById(999L));
    }

    @Test
    void getEvaluationGlobaleByFormationId_found_shouldReturn() {
        when(repository.findByFormationId(100L)).thenReturn(Optional.of(entity));

        EvaluationGlobaleDTO result = service.getEvaluationGlobaleByFormationId(100L);

        assertNotNull(result);
        assertEquals("Bonne formation", result.getCommentaireGeneral());
    }

    @Test
    void getEvaluationGlobaleByFormationId_notFound_shouldThrow() {
        when(repository.findByFormationId(999L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.getEvaluationGlobaleByFormationId(999L));
    }

    @Test
    void getAllEvaluationGlobales_shouldReturnList() {
        when(repository.findAll()).thenReturn(List.of(entity));

        List<EvaluationGlobaleDTO> result = service.getAllEvaluationGlobales();

        assertEquals(1, result.size());
    }
}
