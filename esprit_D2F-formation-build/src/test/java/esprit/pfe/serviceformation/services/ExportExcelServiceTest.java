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
import java.sql.Time;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
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

    private Date startDate;
    private Date endDate;
    private List<FormationDTO> mockFormations;

    @BeforeEach
    void setUp() {
        Calendar cal = Calendar.getInstance();
        cal.set(2026, Calendar.JANUARY, 1);
        startDate = cal.getTime();
        cal.set(2026, Calendar.DECEMBER, 31);
        endDate = cal.getTime();

        mockFormations = new ArrayList<>();

        FormationDTO f1 = new FormationDTO();
        f1.setTitreFormation("Formation Java");
        f1.setDepartement(new DeptDTO() {{ setLibelle("Dept Info"); }});
        f1.setUp(new UpDTO() {{ setLibelle("UP Dev"); }});

        SeanceDTO s1 = new SeanceDTO();
        s1.setDateSeance(startDate);
        s1.setHeureDebut(Time.valueOf("09:00:00"));
        s1.setHeureFin(Time.valueOf("12:00:00"));
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
        FormationDTO f2 = new FormationDTO();
        f2.setTitreFormation("Formation Sans Seance");
        mockFormations.add(f2);
        
        // Formation with out of bounds seance
        FormationDTO f3 = new FormationDTO();
        f3.setTitreFormation("Formation Hors Limite");
        SeanceDTO s3 = new SeanceDTO();
        Calendar outCal = Calendar.getInstance();
        outCal.set(2025, Calendar.JANUARY, 1);
        s3.setDateSeance(outCal.getTime());
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
