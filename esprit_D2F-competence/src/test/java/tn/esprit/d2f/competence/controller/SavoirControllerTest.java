package tn.esprit.d2f.competence.controller;

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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.dto.SavoirRequest;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.service.ISavoirService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SavoirController - Tests")
class SavoirControllerTest {

    @Mock
    private ISavoirService savoirService;

    @InjectMocks
    private SavoirController savoirController;

    private SavoirDTO savoirDTO;

    @BeforeEach
    void setUp() {
        savoirDTO = new SavoirDTO();
        savoirDTO.setId(1L);
    }

    @Test
    void testGetAllSavoirs() {
        Page<SavoirDTO> page = new PageImpl<>(List.of(savoirDTO));
        when(savoirService.getAllSavoirs(any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<SavoirDTO>> response = savoirController.getAllSavoirs(Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void testGetSavoirsBySousCompetence() {
        when(savoirService.getSavoirsBySousCompetence(1L)).thenReturn(List.of(savoirDTO));
        ResponseEntity<List<SavoirDTO>> response = savoirController.getSavoirsBySousCompetence(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetSavoirsByCompetence() {
        when(savoirService.getSavoirsByCompetence(1L)).thenReturn(List.of(savoirDTO));
        ResponseEntity<List<SavoirDTO>> response = savoirController.getSavoirsByCompetence(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetSavoirsByType() {
        when(savoirService.getSavoirsByType(TypeSavoir.THEORIQUE)).thenReturn(List.of(savoirDTO));
        ResponseEntity<List<SavoirDTO>> response = savoirController.getSavoirsByType(TypeSavoir.THEORIQUE);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testSearchSavoirs() {
        Page<SavoirDTO> page = new PageImpl<>(List.of(savoirDTO));
        when(savoirService.searchSavoirs(anyString(), any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<SavoirDTO>> response = savoirController.searchSavoirs("test", Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetSavoirById() {
        when(savoirService.getSavoirById(1L)).thenReturn(savoirDTO);
        ResponseEntity<SavoirDTO> response = savoirController.getSavoirById(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testCreateSavoir() {
        SavoirRequest req = new SavoirRequest();
        when(savoirService.createSavoir(eq(1L), any(SavoirRequest.class))).thenReturn(savoirDTO);
        ResponseEntity<SavoirDTO> response = savoirController.createSavoir(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testCreateSavoirForCompetence() {
        SavoirRequest req = new SavoirRequest();
        when(savoirService.createSavoirForCompetence(eq(1L), any(SavoirRequest.class))).thenReturn(savoirDTO);
        ResponseEntity<SavoirDTO> response = savoirController.createSavoirForCompetence(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testUpdateSavoir() {
        SavoirRequest req = new SavoirRequest();
        when(savoirService.updateSavoir(eq(1L), any(SavoirRequest.class))).thenReturn(savoirDTO);
        ResponseEntity<SavoirDTO> response = savoirController.updateSavoir(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testDeleteSavoir() {
        ResponseEntity<Void> response = savoirController.deleteSavoir(1L);
        verify(savoirService, times(1)).deleteSavoir(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
