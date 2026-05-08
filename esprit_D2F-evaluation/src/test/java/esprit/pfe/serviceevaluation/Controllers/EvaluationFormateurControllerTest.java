package esprit.pfe.serviceevaluation.controllers;

import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.services.EvaluationFormateurService;
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
class EvaluationFormateurControllerTest {

    @Mock
    private EvaluationFormateurService service;
    @InjectMocks
    private EvaluationFormateurController controller;

    @Test
    void ajouterEvalParticipant_shouldReturnCreated() {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        dto.setEnseignantId("ens-1");
        when(service.ajouterEvalParticipant(any())).thenReturn(dto);

        var response = controller.ajouterEvalParticipant(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void modifierEvalParticipant_shouldReturnOk() {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        when(service.modifierEvalParticipant(eq(1L), any())).thenReturn(dto);

        var response = controller.modifierEvalParticipant(1L, dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void supprimerEvalParticipant_shouldDelegate() {
        controller.supprimerEvalParticipant(1L);
        verify(service).supprimerEvalParticipant(1L);
    }

    @Test
    void consulterEvalParticipant_shouldReturnDto() {
        EvaluationFormateurDTO dto = new EvaluationFormateurDTO();
        when(service.getEvaluationDto(1L)).thenReturn(dto);

        var response = controller.consulterEvalParticipant(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void listAllEvaluations_shouldReturnList() {
        when(service.listAllEvaluationsDto()).thenReturn(List.of());

        var response = controller.listAllEvaluations();

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void validerCompetences_shouldReturnOk() {
        var response = controller.validerCompetences(1L);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(service).validerCompetences(1L);
    }

    @Test
    void createEvaluationsBulk_shouldReturnCreated() {
        var response = controller.createEvaluationsBulk(List.of());
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }
}
