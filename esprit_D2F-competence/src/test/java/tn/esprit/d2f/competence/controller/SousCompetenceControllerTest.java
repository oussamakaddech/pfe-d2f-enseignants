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
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.dto.SousCompetenceRequest;
import tn.esprit.d2f.competence.service.ISousCompetenceService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SousCompetenceController - Tests")
class SousCompetenceControllerTest {

    @Mock
    private ISousCompetenceService sousCompetenceService;

    @InjectMocks
    private SousCompetenceController sousCompetenceController;

    private SousCompetenceDTO scDTO;

    @BeforeEach
    void setUp() {
        scDTO = new SousCompetenceDTO();
        scDTO.setId(1L);
    }

    @Test
    void testGetAllSousCompetences() {
        Page<SousCompetenceDTO> page = new PageImpl<>(List.of(scDTO));
        when(sousCompetenceService.getAllSousCompetences(any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<SousCompetenceDTO>> response = sousCompetenceController.getAllSousCompetences(Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetSousCompetencesByCompetence() {
        when(sousCompetenceService.getSousCompetencesByCompetence(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(scDTO)));
        ResponseEntity<Page<SousCompetenceDTO>> response = sousCompetenceController.getSousCompetencesByCompetence(1L, Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetSousCompetenceById() {
        when(sousCompetenceService.getSousCompetenceById(1L)).thenReturn(scDTO);
        ResponseEntity<SousCompetenceDTO> response = sousCompetenceController.getSousCompetenceById(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testSearch() {
        Page<SousCompetenceDTO> page = new PageImpl<>(List.of(scDTO));
        when(sousCompetenceService.searchSousCompetences(anyString(), any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<SousCompetenceDTO>> response = sousCompetenceController.search("test", Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testCreateSousCompetence() {
        SousCompetenceRequest req = new SousCompetenceRequest();
        when(sousCompetenceService.createSousCompetence(eq(1L), any(SousCompetenceRequest.class))).thenReturn(scDTO);
        ResponseEntity<SousCompetenceDTO> response = sousCompetenceController.createSousCompetence(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testCreateSousCompetenceEnfant() {
        SousCompetenceRequest req = new SousCompetenceRequest();
        when(sousCompetenceService.createSousCompetenceEnfant(eq(1L), any(SousCompetenceRequest.class))).thenReturn(scDTO);
        ResponseEntity<SousCompetenceDTO> response = sousCompetenceController.createSousCompetenceEnfant(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testUpdateSousCompetence() {
        SousCompetenceRequest req = new SousCompetenceRequest();
        when(sousCompetenceService.updateSousCompetence(eq(1L), any(SousCompetenceRequest.class))).thenReturn(scDTO);
        ResponseEntity<SousCompetenceDTO> response = sousCompetenceController.updateSousCompetence(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testDeleteSousCompetence() {
        ResponseEntity<Void> response = sousCompetenceController.deleteSousCompetence(1L);
        verify(sousCompetenceService, times(1)).deleteSousCompetence(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
