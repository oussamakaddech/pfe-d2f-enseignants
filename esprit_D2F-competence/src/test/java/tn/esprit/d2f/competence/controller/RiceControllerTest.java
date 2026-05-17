
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
import tn.esprit.d2f.competence.dto.RiceImportRequest;
import tn.esprit.d2f.competence.dto.RiceImportResult;
import tn.esprit.d2f.competence.dto.RiceDomaineRequest;
import tn.esprit.d2f.competence.service.IRiceImportService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RiceController - Tests")
class RiceControllerTest {

    @Mock
    private IRiceImportService riceImportService;

    @InjectMocks
    private RiceController riceController;

    private RiceImportRequest importRequest;
    private RiceImportResult importResult;

    @BeforeEach
    void setUp() {
        importRequest = RiceImportRequest.builder()
                .domaines(List.of(
                        RiceDomaineRequest.builder()
                                .nom("Genie Civil")
                                .code("GC")
                                .build()
                ))
                .build();

        importResult = RiceImportResult.builder()
                .generatedAt(LocalDateTime.now())
                .domainesCreated(1)
                .competencesCreated(3)
                .sousCompetencesCreated(5)
                .savoirsCreated(10)
                .affectationsCreated(2)
                .enseignantsCovered(4)
                .tauxCouvertureParDomaine(Map.of("Genie Civil", 75.0))
                .message("Import reussi")
                .build();
    }

    @Test
    @DisplayName("POST /import - doit retourner 200 avec le resultat de l'import")
    void importRice_ShouldReturnOkWithResult() {
        when(riceImportService.importRice(any(RiceImportRequest.class))).thenReturn(importResult);

        ResponseEntity<RiceImportResult> response = riceController.importRice(importRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDomainesCreated()).isEqualTo(1);
        assertThat(response.getBody().getCompetencesCreated()).isEqualTo(3);
        assertThat(response.getBody().getMessage()).isEqualTo("Import reussi");
        verify(riceImportService).importRice(importRequest);
    }

    @Test
    @DisplayName("GET /imports - doit retourner 200 avec l'historique des imports")
    void getImportHistory_ShouldReturnOkWithHistory() {
        when(riceImportService.getImportHistory()).thenReturn(List.of(importResult));

        ResponseEntity<List<RiceImportResult>> response = riceController.getImportHistory();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getDomainesCreated()).isEqualTo(1);
        verify(riceImportService).getImportHistory();
    }

    @Test
    @DisplayName("GET /imports - doit retourner liste vide si aucun import")
    void getImportHistory_ShouldReturnEmptyListWhenNoHistory() {
        when(riceImportService.getImportHistory()).thenReturn(List.of());

        ResponseEntity<List<RiceImportResult>> response = riceController.getImportHistory();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).isEmpty();
        verify(riceImportService).getImportHistory();
    }
}
