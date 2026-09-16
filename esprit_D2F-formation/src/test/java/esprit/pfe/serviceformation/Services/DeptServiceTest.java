package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
 
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeptServiceTest {

    @Mock private DeptRepository deptRepository;
    @InjectMocks private DeptService service;

    @Test
    void findAllPageableDelegatesToRepository() {
        Page<Dept> page = new PageImpl<>(List.of(new Dept()), PageRequest.of(0, 10), 1);
        when(deptRepository.findAll(any(PageRequest.class))).thenReturn(page);

        Page<Dept> result = service.findAll(PageRequest.of(0, 10));

        assertThat(result).hasSize(1);
        verify(deptRepository).findAll(any(PageRequest.class));
    }

    @Test
    void findByIdThrowsWhenMissing() {
        when(deptRepository.findById("D1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById("D1")).hasMessageContaining("Département introuvable");
    }

    @Test
    void createUpdateDeleteDelegateToRepository() {
        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Initial");
        when(deptRepository.save(any(Dept.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(deptRepository.findById("D1")).thenReturn(Optional.of(dept));

        assertThat(service.create(dept).getId()).isEqualTo("D1");

        Dept updated = new Dept();
        updated.setLibelle("Updated");
        assertThat(service.update("D1", updated).getLibelle()).isEqualTo("Updated");

        service.delete("D1");
        verify(deptRepository).deleteById("D1");
    }

    @Test
    void importDeptsFromExcelSavesValidRowsAndSkipsEmptyWorkbook() throws Exception {
        MockMultipartFile file = excelFile("id", "libelle", new String[][]{{"D1", "Informatique"}, {"", ""}});

        service.importDeptsFromExcel(file);

        verify(deptRepository).saveAll(any());

        reset(deptRepository);

        MockMultipartFile empty = excelFile("id", "libelle", new String[][]{{"", ""}});
        service.importDeptsFromExcel(empty);

        verify(deptRepository, never()).saveAll(anyList());
    }

    private MockMultipartFile excelFile(String header1, String header2, String[][] rows) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("depts");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue(header1);
            header.createCell(1).setCellValue(header2);
            for (int i = 0; i < rows.length; i++) {
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(rows[i][0]);
                row.createCell(1).setCellValue(rows[i][1]);
            }
            workbook.write(out);
            return new MockMultipartFile("file", "depts.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }
}