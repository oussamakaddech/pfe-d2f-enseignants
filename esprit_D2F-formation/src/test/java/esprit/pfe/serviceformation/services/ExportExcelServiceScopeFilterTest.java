package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.DeptDTO;
import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.dto.UpDTO;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Filtres UP / département de l'export Excel du calendrier
 * (paramètres `up` et `departement` de GET /formations-workflow/export/excel).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ExportExcelService - Filtres UP / département")
class ExportExcelServiceScopeFilterTest {

    @Mock
    private FormationWorkflowService formationWorkflowService;

    @InjectMocks
    private ExportExcelService exportExcelService;

    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        startDate = LocalDate.of(2026, 1, 1);
        endDate = LocalDate.of(2026, 12, 31);
    }

    private FormationResponseDTO formation(String titre, String upId, String upLibelle,
                                           String deptId, String deptLibelle) {
        FormationResponseDTO f = new FormationResponseDTO();
        f.setTitreFormation(titre);

        UpDTO up = new UpDTO();
        up.setId(upId);
        up.setLibelle(upLibelle);
        f.setUp(up);

        DeptDTO dept = new DeptDTO();
        dept.setId(deptId);
        dept.setLibelle(deptLibelle);
        f.setDepartement(dept);

        SeanceDTO seance = new SeanceDTO();
        seance.setDateSeance(LocalDate.of(2026, 3, 10));
        seance.setHeureDebut(LocalTime.of(9, 0));
        seance.setHeureFin(LocalTime.of(12, 0));
        seance.setSalle("Salle A");

        EnseignantDTO participant = new EnseignantDTO();
        participant.setNom("BEN ALI");
        participant.setPrenom("Sami");
        participant.setMail("sami@esprit.tn");
        seance.setParticipants(List.of(participant));

        f.setSeances(List.of(seance));
        return f;
    }

    private Workbook open(ByteArrayOutputStream out) throws IOException {
        return new XSSFWorkbook(new ByteArrayInputStream(out.toByteArray()));
    }

    @Test
    @DisplayName("sans filtre, toutes les formations sont exportées")
    void sansFiltre() throws IOException {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(List.of(
                formation("Formation GC", "UP_GC", "Génie Civil", "DEPT_GC", "Génie Civil"),
                formation("Formation GL", "UP_GL", "Génie Logiciel", "DEPT_GL", "Génie Logiciel")));

        try (Workbook wb = open(exportExcelService.exportFormationsAvance(startDate, endDate))) {
            Sheet resume = wb.getSheet("Résumé");
            assertThat(resume.getRow(4).getCell(1).getStringCellValue()).isEqualTo("2");
            assertThat(wb.getSheet("Formation GC")).isNotNull();
            assertThat(wb.getSheet("Formation GL")).isNotNull();
        }
    }

    @Test
    @DisplayName("le filtre UP ne garde que les formations de l'UP demandée")
    void filtreParCodeUp() throws IOException {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(List.of(
                formation("Formation GC", "UP_GC", "Génie Civil", "DEPT_GC", "Génie Civil"),
                formation("Formation GL", "UP_GL", "Génie Logiciel", "DEPT_GL", "Génie Logiciel")));

        try (Workbook wb = open(exportExcelService.exportFormationsAvance(startDate, endDate, "UP_GC", null))) {
            Sheet resume = wb.getSheet("Résumé");
            assertThat(resume.getRow(4).getCell(1).getStringCellValue()).isEqualTo("1");
            assertThat(wb.getSheet("Formation GC")).isNotNull();
            assertThat(wb.getSheet("Formation GL")).isNull();
            // Le filtre est écrit dans le sous-titre et dans les indicateurs.
            assertThat(resume.getRow(1).getCell(0).getStringCellValue()).contains("UP: UP_GC");
            assertThat(resume.getRow(10).getCell(1).getStringCellValue()).isEqualTo("UP_GC");
        }
    }

    @Test
    @DisplayName("le filtre UP accepte aussi le libellé")
    void filtreParLibelleUp() throws IOException {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(List.of(
                formation("Formation GC", "UP_GC", "Génie Civil", "DEPT_GC", "Génie Civil"),
                formation("Formation GL", "UP_GL", "Génie Logiciel", "DEPT_GL", "Génie Logiciel")));

        try (Workbook wb = open(exportExcelService.exportFormationsAvance(startDate, endDate, "Génie Civil", null))) {
            assertThat(wb.getSheet("Formation GC")).isNotNull();
            assertThat(wb.getSheet("Formation GL")).isNull();
        }
    }

    @Test
    @DisplayName("le filtre département ne garde que les formations du département demandé")
    void filtreParDepartement() throws IOException {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(List.of(
                formation("Formation GC", "UP_GC", "Génie Civil", "DEPT_GC", "Génie Civil"),
                formation("Formation GL", "UP_GL", "Génie Logiciel", "DEPT_GL", "Génie Logiciel")));

        try (Workbook wb = open(exportExcelService.exportFormationsAvance(startDate, endDate, null, "DEPT_GL"))) {
            Sheet resume = wb.getSheet("Résumé");
            assertThat(resume.getRow(4).getCell(1).getStringCellValue()).isEqualTo("1");
            assertThat(wb.getSheet("Formation GL")).isNotNull();
            assertThat(wb.getSheet("Formation GC")).isNull();
            assertThat(resume.getRow(1).getCell(0).getStringCellValue()).contains("Département: DEPT_GL");
            assertThat(resume.getRow(11).getCell(1).getStringCellValue()).isEqualTo("DEPT_GL");
        }
    }

    @Test
    @DisplayName("les filtres UP et département se cumulent")
    void filtresCumules() throws IOException {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(List.of(
                formation("Formation GC", "UP_GC", "Génie Civil", "DEPT_GC", "Génie Civil"),
                formation("Formation GL", "UP_GC", "Génie Civil", "DEPT_GL", "Génie Logiciel")));

        try (Workbook wb = open(exportExcelService.exportFormationsAvance(startDate, endDate, "UP_GC", "DEPT_GL"))) {
            assertThat(wb.getSheet("Formation GL")).isNotNull();
            assertThat(wb.getSheet("Formation GC")).isNull();
            Sheet resume = wb.getSheet("Résumé");
            assertThat(resume.getRow(1).getCell(0).getStringCellValue())
                    .contains("UP: UP_GC")
                    .contains("Département: DEPT_GL");
        }
    }

    @Test
    @DisplayName("un filtre sans correspondance produit un classeur vide (aucune formation)")
    void filtreSansCorrespondance() throws IOException {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(List.of(
                formation("Formation GC", "UP_GC", "Génie Civil", "DEPT_GC", "Génie Civil")));

        try (Workbook wb = open(exportExcelService.exportFormationsAvance(startDate, endDate, "UP_INEXISTANTE", null))) {
            Sheet resume = wb.getSheet("Résumé");
            assertThat(resume.getRow(4).getCell(1).getStringCellValue()).isEqualTo("0");
            assertThat(wb.getSheet("Formation GC")).isNull();
        }
    }
}
