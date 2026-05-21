package tn.esprit.d2f.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.d2f.dto.BesoinCompetenceDTO;
import tn.esprit.d2f.service.IBesoinCompetenceService;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BesoinCompetenceControllerTest {

    @Mock
    private IBesoinCompetenceService service;

    private BesoinCompetenceController controller;

    @BeforeEach
    void setUp() {
        controller = new BesoinCompetenceController(service);
    }

    @Test
    void getByBesoin_shouldReturnEmptyList() {
        long besoinId = 1L;
        when(service.getByBesoin(besoinId)).thenReturn(Collections.emptyList());

        ResponseEntity<List<BesoinCompetenceDTO>> response = controller.getByBesoin(besoinId);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());
        verify(service).getByBesoin(besoinId);
    }

    @Test
    void getByBesoin_shouldReturnCompetenceList() {
        long besoinId = 1L;
        BesoinCompetenceDTO dto = BesoinCompetenceDTO.builder()
                .id(1L)
                .besoinId(besoinId)
                .domaineId(10L)
                .competenceId(20L)
                .competenceNom("Java Programming")
                .savoirId(30L)
                .savoirNom("OOP")
                .sousCompetenceId(40L)
                .build();

        when(service.getByBesoin(besoinId)).thenReturn(Arrays.asList(dto));

        ResponseEntity<List<BesoinCompetenceDTO>> response = controller.getByBesoin(besoinId);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals("Java Programming", response.getBody().get(0).getCompetenceNom());
        verify(service).getByBesoin(besoinId);
    }

    @Test
    void getByBesoin_shouldReturnMultipleCompetences() {
        long besoinId = 2L;
        BesoinCompetenceDTO dto1 = BesoinCompetenceDTO.builder()
                .id(1L)
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        BesoinCompetenceDTO dto2 = BesoinCompetenceDTO.builder()
                .id(2L)
                .besoinId(besoinId)
                .competenceId(21L)
                .competenceNom("Spring Boot")
                .build();

        when(service.getByBesoin(besoinId)).thenReturn(Arrays.asList(dto1, dto2));

        ResponseEntity<List<BesoinCompetenceDTO>> response = controller.getByBesoin(besoinId);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
        verify(service).getByBesoin(besoinId);
    }

    @Test
    void replaceAll_shouldReturnUpdatedCompetences() {
        long besoinId = 1L;
        BesoinCompetenceDTO inputDto = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        BesoinCompetenceDTO outputDto = BesoinCompetenceDTO.builder()
                .id(1L)
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        when(service.replaceAll(besoinId, Arrays.asList(inputDto))).thenReturn(Arrays.asList(outputDto));

        ResponseEntity<List<BesoinCompetenceDTO>> response = controller.replaceAll(besoinId, Arrays.asList(inputDto));

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals("Java", response.getBody().get(0).getCompetenceNom());
        verify(service).replaceAll(besoinId, Arrays.asList(inputDto));
    }

    @Test
    void replaceAll_shouldReturnMultipleUpdatedCompetences() {
        long besoinId = 1L;
        BesoinCompetenceDTO input1 = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        BesoinCompetenceDTO input2 = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .competenceId(21L)
                .competenceNom("Spring")
                .build();

        BesoinCompetenceDTO output1 = BesoinCompetenceDTO.builder()
                .id(1L)
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        BesoinCompetenceDTO output2 = BesoinCompetenceDTO.builder()
                .id(2L)
                .besoinId(besoinId)
                .competenceId(21L)
                .competenceNom("Spring")
                .build();

        when(service.replaceAll(besoinId, Arrays.asList(input1, input2))).thenReturn(Arrays.asList(output1, output2));

        ResponseEntity<List<BesoinCompetenceDTO>> response = controller.replaceAll(besoinId, Arrays.asList(input1, input2));

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
        verify(service).replaceAll(besoinId, Arrays.asList(input1, input2));
    }

    @Test
    void replaceAll_withEmptyList_shouldReturnEmptyList() {
        long besoinId = 1L;
        when(service.replaceAll(besoinId, Collections.emptyList())).thenReturn(Collections.emptyList());

        ResponseEntity<List<BesoinCompetenceDTO>> response = controller.replaceAll(besoinId, Collections.emptyList());

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
        verify(service).replaceAll(besoinId, Collections.emptyList());
    }
}
