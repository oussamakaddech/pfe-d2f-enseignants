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
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.dto.DomaineRequest;
import tn.esprit.d2f.competence.service.IDomaineService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DomaineController - Tests")
class DomaineControllerTest {

    @Mock
    private IDomaineService domaineService;

    @InjectMocks
    private DomaineController domaineController;

    private DomaineDTO domaineDTO;

    @BeforeEach
    void setUp() {
        domaineDTO = new DomaineDTO();
        domaineDTO.setId(1L);
        domaineDTO.setCode("D1");
        domaineDTO.setNom("Domaine 1");
    }

    @Test
    void testGetAllDomaines() {
        Page<DomaineDTO> page = new PageImpl<>(List.of(domaineDTO));
        when(domaineService.getAllDomaines(any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<DomaineDTO>> response = domaineController.getAllDomaines(Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void testGetDomainesActifs() {
        when(domaineService.getDomainesActifs()).thenReturn(List.of(domaineDTO));
        ResponseEntity<List<DomaineDTO>> response = domaineController.getDomainesActifs();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetDomaineById() {
        when(domaineService.getDomaineById(1L)).thenReturn(domaineDTO);
        ResponseEntity<DomaineDTO> response = domaineController.getDomaineById(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetDomaineByCode() {
        when(domaineService.getDomaineByCode("D1")).thenReturn(domaineDTO);
        ResponseEntity<DomaineDTO> response = domaineController.getDomaineByCode("D1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testSearch() {
        Page<DomaineDTO> page = new PageImpl<>(List.of(domaineDTO));
        when(domaineService.searchDomaines(anyString(), any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<DomaineDTO>> response = domaineController.search("test", Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testCreateDomaine() {
        DomaineRequest req = new DomaineRequest();
        when(domaineService.createDomaine(any(DomaineRequest.class))).thenReturn(domaineDTO);
        ResponseEntity<DomaineDTO> response = domaineController.createDomaine(req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testUpdateDomaine() {
        DomaineRequest req = new DomaineRequest();
        when(domaineService.updateDomaine(eq(1L), any(DomaineRequest.class))).thenReturn(domaineDTO);
        ResponseEntity<DomaineDTO> response = domaineController.updateDomaine(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testDeleteDomaine() {
        ResponseEntity<Void> response = domaineController.deleteDomaine(1L);
        verify(domaineService, times(1)).deleteDomaine(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void testToggleActif() {
        when(domaineService.toggleActif(1L)).thenReturn(domaineDTO);
        ResponseEntity<DomaineDTO> response = domaineController.toggleActif(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
