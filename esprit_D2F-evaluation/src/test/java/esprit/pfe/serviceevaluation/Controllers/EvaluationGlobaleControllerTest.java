package esprit.pfe.serviceevaluation.controllers;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.services.EvaluationGlobaleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EvaluationGlobaleControllerTest {

    @Mock
    private EvaluationGlobaleService service;
    @InjectMocks
    private EvaluationGlobaleController controller;

    @Test
    void createEvaluationGlobale_shouldReturnOk() {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        dto.setFormationId(1L);
        when(service.createEvaluationGlobale(any())).thenReturn(dto);

        var response = controller.createEvaluationGlobale(dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1L, response.getBody().getFormationId());
    }

    @Test
    void getAllEvaluationGlobales_shouldReturnList() {
        when(service.getAllEvaluationGlobales()).thenReturn(List.of(new EvaluationGlobaleDTO()));

        var response = controller.getAllEvaluationGlobales();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getEvaluationGlobaleById_shouldReturnDto() {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        dto.setIdEvalGlobale(1L);
        when(service.getEvaluationGlobaleById(1L)).thenReturn(dto);

        var response = controller.getEvaluationGlobaleById(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1L, response.getBody().getIdEvalGlobale());
    }

    @Test
    void getByFormationId_shouldReturnDto() {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        when(service.getEvaluationGlobaleByFormationId(100L)).thenReturn(dto);

        var response = controller.getEvaluationGlobaleByFormationId(100L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void updateEvaluationGlobale_shouldReturnUpdated() {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        when(service.updateEvaluationGlobale(eq(1L), any())).thenReturn(dto);

        var response = controller.updateEvaluationGlobale(1L, dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void deleteEvaluationGlobale_shouldReturnNoContent() {
        var response = controller.deleteEvaluationGlobale(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(service).deleteEvaluationGlobale(1L);
    }
}
