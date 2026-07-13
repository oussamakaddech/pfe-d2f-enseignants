package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collections;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MissingServicesTest {

    @Mock private DeptRepository deptRepository;
    @InjectMocks private DeptService deptService;

    @Mock private UpRepository upRepository;
    @InjectMocks private UpService upService;

    @Mock private SeanceFormationRepository seanceRepo;
    @Mock private PresenceRepository presenceRepo;
    @InjectMocks private FormationReportService formationReportService;

    @Test
    @DisplayName("DeptService - Import from Excel")
    void testImportDeptsFromExcel() throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet();
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("NOM");
        
        Row data = sheet.createRow(1);
        data.createCell(0).setCellValue("D1");
        data.createCell(1).setCellValue("Dept 1");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());

        deptService.importDeptsFromExcel(file);

        verify(deptRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("UpService - Import from Excel")
    void testImportUpsFromExcel() throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet();
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("LIBELLE");
        
        Row data = sheet.createRow(1);
        data.createCell(0).setCellValue("U1");
        data.createCell(1).setCellValue("Up 1");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());

        upService.importUpsFromExcel(file);

        verify(upRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("FormationReportService - animateur role")
    void testGetFormationsAnimateur() {
        LocalDate start = LocalDate.now();
        LocalDate end = LocalDate.now();
        when(seanceRepo.findFormationsByAnimateurAndPeriod(anyString(), any(), any())).thenReturn(Collections.emptyList());

        List<Object> results = formationReportService.getFormationsParRoleEtPeriode("animateur", "E1", start, end);
        
        assertNotNull(results);
        verify(seanceRepo).findFormationsByAnimateurAndPeriod("E1", start, end);
    }

    @Test
    @DisplayName("FormationReportService - participant role")
    void testGetFormationsParticipant() {
        LocalDate start = LocalDate.now();
        LocalDate end = LocalDate.now();
        when(presenceRepo.findFormationsByParticipantAndPeriod(anyString(), any(), any())).thenReturn(Collections.emptyList());

        List<Object> results = formationReportService.getFormationsParRoleEtPeriode("participant", "E1", start, end);
        
        assertNotNull(results);
        verify(presenceRepo).findFormationsByParticipantAndPeriod("E1", start, end);
    }

    @Test
    @DisplayName("FormationReportService - invalid role")
    void testGetFormationsInvalidRole() {
        LocalDate start = LocalDate.now();
        LocalDate end = LocalDate.now();
        assertThrows(IllegalArgumentException.class, () -> {
            formationReportService.getFormationsParRoleEtPeriode("invalid", "E1", start, end);
        });
    }
}
