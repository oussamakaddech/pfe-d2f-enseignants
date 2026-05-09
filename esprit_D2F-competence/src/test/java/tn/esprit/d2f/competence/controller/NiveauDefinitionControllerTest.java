package tn.esprit.d2f.competence.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisDTO;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisRequest;
import tn.esprit.d2f.competence.dto.NiveauxGroupesDTO;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.INiveauDefinitionService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NiveauDefinitionController - Tests")
class NiveauDefinitionControllerTest {

    @Mock
    private INiveauDefinitionService niveauService;

    @InjectMocks
    private NiveauDefinitionController controller;

    private NiveauSavoirRequisDTO dto;

    @BeforeEach
    void setUp() {
        dto = new NiveauSavoirRequisDTO();
        dto.setId(1L);
    }

    @Test
    void testGetAll() {
        when(niveauService.getAll()).thenReturn(List.of(dto));
        ResponseEntity<List<NiveauSavoirRequisDTO>> response = controller.getAll();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void testGetByCompetence() {
        NiveauxGroupesDTO grouped = NiveauxGroupesDTO.builder().parentId(1L).build();
        when(niveauService.getNiveauxByCompetence(1L)).thenReturn(grouped);
        ResponseEntity<NiveauxGroupesDTO> response = controller.getByCompetence(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetBySousCompetence() {
        NiveauxGroupesDTO grouped = NiveauxGroupesDTO.builder().parentId(1L).build();
        when(niveauService.getNiveauxBySousCompetence(1L)).thenReturn(grouped);
        ResponseEntity<NiveauxGroupesDTO> response = controller.getBySousCompetence(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetByCompetenceAndNiveau() {
        when(niveauService.getSavoirsRequisByCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT)).thenReturn(List.of(dto));
        ResponseEntity<List<NiveauSavoirRequisDTO>> response = controller.getByCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetBySousCompetenceAndNiveau() {
        when(niveauService.getSavoirsRequisBySousCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT)).thenReturn(List.of(dto));
        ResponseEntity<List<NiveauSavoirRequisDTO>> response = controller.getBySousCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testAddSavoirRequis() {
        NiveauSavoirRequisRequest req = new NiveauSavoirRequisRequest();
        when(niveauService.addSavoirRequis(any(NiveauSavoirRequisRequest.class))).thenReturn(dto);
        ResponseEntity<NiveauSavoirRequisDTO> response = controller.addSavoirRequis(req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testUpdateSavoirRequis() {
        NiveauSavoirRequisRequest req = new NiveauSavoirRequisRequest();
        when(niveauService.updateSavoirRequis(eq(1L), any(NiveauSavoirRequisRequest.class))).thenReturn(dto);
        ResponseEntity<NiveauSavoirRequisDTO> response = controller.updateSavoirRequis(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testRemoveSavoirRequis() {
        ResponseEntity<Void> response = controller.removeSavoirRequis(1L);
        verify(niveauService, times(1)).removeSavoirRequis(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
