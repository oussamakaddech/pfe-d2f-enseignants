package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EnseignantExcelService - Tests unitaires")
class EnseignantExcelServiceTest {

    @Mock private EnseignantRepository enseignantRepository;
    @Mock private DeptRepository deptRepository;
    @Mock private UpRepository upRepository;

    @InjectMocks
    private EnseignantExcelService excelService;

    @Test
    @DisplayName("importEnseignantsFromExcel - Succès")
    void shouldImportEnseignantsFromExcel() throws Exception {
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet();
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("Nom");
        
        Row data = sheet.createRow(1);
        data.createCell(0).setCellValue("Ben Ali");
        data.createCell(1).setCellValue("Ali");
        data.createCell(2).setCellValue("ali@esprit.tn");
        data.createCell(3).setCellValue("PERMANENT");
        data.createCell(4).setCellValue("ACTIF");
        data.createCell(5).setCellValue("N");
        data.createCell(6).setCellValue("D1");
        data.createCell(7).setCellValue("U1");
        data.createCell(8).setCellValue("N");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());

        when(deptRepository.findById("D1")).thenReturn(Optional.of(new Dept()));
        when(upRepository.findById("U1")).thenReturn(Optional.of(new Up()));

        excelService.importEnseignantsFromExcel(file);

        verify(enseignantRepository).save(any(Enseignant.class));
        wb.close();
    }
}
