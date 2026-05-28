package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.repositories.UpRepository;
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
class UpServiceTest {

    @Mock private UpRepository upRepository;
    @InjectMocks private UpService service;

    @Test
    void findAllPageableDelegatesToRepository() {
        Page<Up> page = new PageImpl<>(List.of(new Up()), PageRequest.of(0, 10), 1);
        when(upRepository.findAll(any(PageRequest.class))).thenReturn(page);

        Page<Up> result = service.findAll(PageRequest.of(0, 10));

        assertThat(result).hasSize(1);
        verify(upRepository).findAll(any(PageRequest.class));
    }

    @Test
    void findByIdThrowsWhenMissing() {
        when(upRepository.findById("UP1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById("UP1")).hasMessageContaining("UP introuvable");
    }

    @Test
    void createUpdateDeleteDelegateToRepository() {
        Up up = new Up();
        up.setId("UP1");
        up.setLibelle("Initial");
        when(upRepository.save(any(Up.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(upRepository.findById("UP1")).thenReturn(Optional.of(up));

        assertThat(service.create(up).getId()).isEqualTo("UP1");

        Up updated = new Up();
        updated.setLibelle("Updated");
        assertThat(service.update("UP1", updated).getLibelle()).isEqualTo("Updated");

        service.delete("UP1");
        verify(upRepository).deleteById("UP1");
    }

    @Test
    void importUpsFromExcelSavesValidRowsAndSkipsEmptyWorkbook() throws Exception {
        MockMultipartFile file = excelFile(new String[][]{{"UP1", "Informatique"}, {"", ""}});

        service.importUpsFromExcel(file);

        verify(upRepository).saveAll(any());

        reset(upRepository);

        MockMultipartFile empty = excelFile(new String[][]{{"", ""}});
        service.importUpsFromExcel(empty);

        verify(upRepository, never()).saveAll(anyList());
    }

    private MockMultipartFile excelFile(String[][] rows) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("ups");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("id");
            header.createCell(1).setCellValue("libelle");
            for (int i = 0; i < rows.length; i++) {
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(rows[i][0]);
                row.createCell(1).setCellValue(rows[i][1]);
            }
            workbook.write(out);
            return new MockMultipartFile("file", "ups.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        }
    }
}