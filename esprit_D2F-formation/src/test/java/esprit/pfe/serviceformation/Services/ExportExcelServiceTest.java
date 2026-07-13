package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExportExcelService - Tests unitaires")
class ExportExcelServiceTest {

    @Mock
    private FormationWorkflowService formationWorkflowService;

    @InjectMocks
    private ExportExcelService exportExcelService;

    private LocalDate startDate;
    private LocalDate endDate;
    private List<FormationResponseDTO> mockFormations;

    @BeforeEach
    void setUp() {
        startDate = LocalDate.of(2026, 1, 1);
        endDate = LocalDate.of(2026, 12, 31);

        mockFormations = new ArrayList<>();

        FormationResponseDTO f1 = new FormationResponseDTO();
        f1.setTitreFormation("Formation Java");
        f1.setDepartement(new DeptDTO() {{ setLibelle("Dept Info"); }});
        f1.setUp(new UpDTO() {{ setLibelle("UP Dev"); }});

        SeanceDTO s1 = new SeanceDTO();
        s1.setDateSeance(startDate);
        s1.setHeureDebut(LocalTime.of(9, 0));
        s1.setHeureFin(LocalTime.of(12, 0));
        s1.setSalle("Salle 1");

        EnseignantDTO anim = new EnseignantDTO();
        anim.setNom("Ben Ali");
        anim.setPrenom("Sami");
        s1.setAnimateurs(List.of(anim));

        EnseignantDTO part = new EnseignantDTO();
        part.setNom("Foulen");
        part.setPrenom("Ben Foulen");
        part.setMail("foulen@esprit.tn");
        s1.setParticipants(List.of(part));

        f1.setSeances(List.of(s1));
        mockFormations.add(f1);
        
        // Formation without seances
        FormationResponseDTO f2 = new FormationResponseDTO();
        f2.setTitreFormation("Formation Sans Seance");
        mockFormations.add(f2);
        
        // Formation with out of bounds seance
        FormationResponseDTO f3 = new FormationResponseDTO();
        f3.setTitreFormation("Formation Hors Limite");
        SeanceDTO s3 = new SeanceDTO();
        s3.setDateSeance(LocalDate.of(2025, 1, 1));
        f3.setSeances(List.of(s3));
        mockFormations.add(f3);
    }

    @Test
    @DisplayName("exportFormationsAvance - Devrait generer un ByteArrayOutputStream valide")
    void shouldExportFormationsAvance() throws IOException {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(mockFormations);

        ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);

        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThan(0);
    }
}
