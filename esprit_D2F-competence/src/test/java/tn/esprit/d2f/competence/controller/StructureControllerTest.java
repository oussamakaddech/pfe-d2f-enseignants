
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
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.service.IStructureService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StructureController - Tests")
class StructureControllerTest {

    @Mock
    private IStructureService structureService;

    @InjectMocks
    private StructureController structureController;

    private StructureArbreDTO structureArbreDTO;
    private StructureArbreDTO.DomaineArbreDTO domaineArbreDTO;
    private SearchResultDTO searchResultDTO;

    @BeforeEach
    void setUp() {
        domaineArbreDTO = StructureArbreDTO.DomaineArbreDTO.builder()
                .id(1L)
                .code("GC")
                .nom("Genie Civil")
                .description("Domaine Genie Civil")
                .actif(true)
                .nombreCompetences(3)
                .nombreEnseignants(10L)
                .competences(List.of())
                .build();

        StructureArbreDTO.StatistiquesDTO stats = StructureArbreDTO.StatistiquesDTO.builder()
                .totalDomaines(1)
                .totalCompetences(3)
                .totalSousCompetences(5)
                .totalSavoirs(10)
                .totalSavoirsTheoriques(6)
                .totalSavoirsPratiques(4)
                .build();

        structureArbreDTO = StructureArbreDTO.builder()
                .domaines(List.of(domaineArbreDTO))
                .statistiques(stats)
                .build();

        searchResultDTO = SearchResultDTO.builder()
                .keyword("sols")
                .domaines(List.of())
                .competences(List.of())
                .sousCompetences(List.of())
                .savoirs(List.of())
                .totalResults(0)
                .build();
    }

    @Test
    @DisplayName("GET /arbre - doit retourner la structure complete")
    void getStructureComplete_ShouldReturnOkWithStructure() {
        when(structureService.getStructureComplete()).thenReturn(structureArbreDTO);

        ResponseEntity<StructureArbreDTO> response = structureController.getStructureComplete(null, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDomaines()).hasSize(1);
        assertThat(response.getBody().getDomaines().get(0).getNom()).isEqualTo("Genie Civil");
        assertThat(response.getBody().getStatistiques().getTotalDomaines()).isEqualTo(1);
        verify(structureService).getStructureComplete();
    }

    @Test
    @DisplayName("GET /arbre/domaine/{domaineId} - doit retourner la structure d'un domaine")
    void getStructureDomaine_ShouldReturnOkWithDomaine() {
        when(structureService.getStructureDomaine(1L)).thenReturn(domaineArbreDTO);

        ResponseEntity<StructureArbreDTO.DomaineArbreDTO> response = structureController.getStructureDomaine(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(1L);
        assertThat(response.getBody().getNom()).isEqualTo("Genie Civil");
        verify(structureService).getStructureDomaine(1L);
    }

    @Test
    @DisplayName("GET /recherche - doit retourner les resultats de recherche globale")
    void rechercheGlobale_ShouldReturnOkWithResults() {
        when(structureService.rechercheGlobale("sols")).thenReturn(searchResultDTO);

        ResponseEntity<SearchResultDTO> response = structureController.rechercheGlobale("sols");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getKeyword()).isEqualTo("sols");
        verify(structureService).rechercheGlobale("sols");
    }

    @Test
    @DisplayName("GET /recherche/domaine/{domaineId} - doit retourner les resultats filtres par domaine")
    void rechercheParDomaine_ShouldReturnOkWithResults() {
        when(structureService.rechercheParDomaine(1L, "sols")).thenReturn(searchResultDTO);

        ResponseEntity<SearchResultDTO> response = structureController.rechercheParDomaine(1L, "sols");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(structureService).rechercheParDomaine(1L, "sols");
    }

    @Test
    @DisplayName("GET /arbre?upId=1 - doit appeler getStructureComplete(upId, departementId)")
    void getStructureComplete_WithUpId_ShouldCallFilteredMethod() {
        when(structureService.getStructureComplete("1", null)).thenReturn(structureArbreDTO);

        ResponseEntity<StructureArbreDTO> response = structureController.getStructureComplete("1", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(structureService).getStructureComplete("1", null);
        verify(structureService, never()).getStructureComplete();
    }

    @Test
    @DisplayName("GET /arbre?departementId=2 - doit appeler getStructureComplete(upId, departementId)")
    void getStructureComplete_WithDepartementId_ShouldCallFilteredMethod() {
        when(structureService.getStructureComplete(null, "2")).thenReturn(structureArbreDTO);

        ResponseEntity<StructureArbreDTO> response = structureController.getStructureComplete(null, "2");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(structureService).getStructureComplete(null, "2");
        verify(structureService, never()).getStructureComplete();
    }

    @Test
    @DisplayName("GET /arbre?upId=1&departementId=2 - doit appeler getStructureComplete avec les deux filtres")
    void getStructureComplete_WithBothFilters_ShouldCallFilteredMethod() {
        when(structureService.getStructureComplete("1", "2")).thenReturn(structureArbreDTO);

        ResponseEntity<StructureArbreDTO> response = structureController.getStructureComplete("1", "2");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(structureService).getStructureComplete("1", "2");
        verify(structureService, never()).getStructureComplete();
    }
}
