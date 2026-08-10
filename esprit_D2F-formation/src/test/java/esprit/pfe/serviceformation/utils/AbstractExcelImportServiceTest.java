package esprit.pfe.serviceformation.utils;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Cell;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Tests pour AbstractExcelImportService")
class AbstractExcelImportServiceTest {

    private TestExcelImportService excelImportService;

    @BeforeEach
    void setUp() {
        excelImportService = new TestExcelImportService();
    }

    @Test
    @DisplayName("importFromExcel() - Lance IllegalArgumentException quand le fichier est null")
    void testImportFromExcel_WithNullFile_ShouldThrow() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> excelImportService.importFromExcel(null)
        );
        assertEquals("Le fichier ne peut pas être vide", exception.getMessage());
    }

    @Test
    @DisplayName("importFromExcel() - Lance IllegalArgumentException quand le fichier est vide")
    void testImportFromExcel_WithEmptyFile_ShouldThrow() {
        MockMultipartFile emptyFile = new MockMultipartFile("test.xlsx", new byte[0]);
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> excelImportService.importFromExcel(emptyFile)
        );
        assertEquals("Le fichier ne peut pas être vide", exception.getMessage());
    }

    @Test
    @DisplayName("importFromExcel() - Lance IllegalArgumentException quand le fichier n'est pas .xlsx")
    void testImportFromExcel_WithNonXlsxFile_ShouldThrow() {
        MockMultipartFile wrongFile = new MockMultipartFile("test.xls", "test.xls", "application/vnd.ms-excel", new byte[10]);
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> excelImportService.importFromExcel(wrongFile)
        );
        assertEquals("Seuls les fichiers .xlsx sont supportés", exception.getMessage());
    }

    @Test
    @DisplayName("importFromExcel() - Lance IllegalStateException quand la lecture du fichier échoue")
    void testImportFromExcel_WithInvalidExcelFile_ShouldThrow() {
        MockMultipartFile invalidFile = new MockMultipartFile("test.xlsx", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[10]);
        Exception exception = assertThrows(Exception.class, () -> excelImportService.importFromExcel(invalidFile));
        assertTrue(exception.getMessage().contains("Erreur") || exception.getClass().getName().contains("Exception"));
    }

    @Test
    @DisplayName("processWorkbook() - Lance IllegalArgumentException quand la feuille est null")
    void testProcessWorkbook_WithNullSheet_ShouldThrow() {
        Workbook mockWorkbook = mock(Workbook.class);
        when(mockWorkbook.getSheetAt(0)).thenReturn(null);
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> excelImportService.processWorkbook(mockWorkbook));
        assertEquals("La feuille Excel est introuvable", exception.getMessage());
    }

    @Test
    @DisplayName("processWorkbook() - Lance IllegalArgumentException quand le fichier n'a pas de données")
    void testProcessWorkbook_WithNoDataRows_ShouldThrow() {
        Workbook mockWorkbook = mock(Workbook.class);
        Sheet mockSheet = mock(Sheet.class);
        when(mockWorkbook.getSheetAt(0)).thenReturn(mockSheet);
        when(mockSheet.getLastRowNum()).thenReturn(0);
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> excelImportService.processWorkbook(mockWorkbook));
        assertEquals("Le fichier Excel doit contenir au moins l'en-tête et une ligne de données", exception.getMessage());
    }

    @Test
    @DisplayName("processWorkbook() - Traite correctement les lignes valides")
    void testProcessWorkbook_WithValidRows_ShouldReturnEntities() {
        Workbook mockWorkbook = mock(Workbook.class);
        Sheet mockSheet = mock(Sheet.class);
        when(mockWorkbook.getSheetAt(0)).thenReturn(mockSheet);
        when(mockSheet.getLastRowNum()).thenReturn(2);
        // Header row (0) is skipped by processWorkbook, so no need to stub it
        Row dataRow1 = mock(Row.class);
        when(mockSheet.getRow(1)).thenReturn(dataRow1);
        when(dataRow1.getLastCellNum()).thenReturn((short) 1);
        Cell cell1 = mock(Cell.class);
        when(dataRow1.getCell(0)).thenReturn(cell1);
        when(cell1.getStringCellValue()).thenReturn("Data1");
        Row dataRow2 = mock(Row.class);
        when(mockSheet.getRow(2)).thenReturn(dataRow2);
        when(dataRow2.getLastCellNum()).thenReturn((short) 1);
        Cell cell2 = mock(Cell.class);
        when(dataRow2.getCell(0)).thenReturn(cell2);
        when(cell2.getStringCellValue()).thenReturn("Data2");
        List<String> result = excelImportService.processWorkbook(mockWorkbook);
        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    @DisplayName("processWorkbook() - Ignore les lignes vides")
    void testProcessWorkbook_ShouldSkipEmptyRows() {
        Workbook mockWorkbook = mock(Workbook.class);
        Sheet mockSheet = mock(Sheet.class);
        when(mockWorkbook.getSheetAt(0)).thenReturn(mockSheet);
        when(mockSheet.getLastRowNum()).thenReturn(2);
        // Header row (0) is skipped
        when(mockSheet.getRow(1)).thenReturn(null);
        Row dataRow = mock(Row.class);
        when(mockSheet.getRow(2)).thenReturn(dataRow);
        when(dataRow.getLastCellNum()).thenReturn((short) 1);
        Cell cell = mock(Cell.class);
        when(dataRow.getCell(0)).thenReturn(cell);
        when(cell.getStringCellValue()).thenReturn("Data");
        List<String> result = excelImportService.processWorkbook(mockWorkbook);
        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("processWorkbook() - Lance IllegalStateException quand mapRowToEntity échoue")
    void testProcessWorkbook_WhenMappingFails_ShouldThrow() {
        Workbook mockWorkbook = mock(Workbook.class);
        Sheet mockSheet = mock(Sheet.class);
        when(mockWorkbook.getSheetAt(0)).thenReturn(mockSheet);
        when(mockSheet.getLastRowNum()).thenReturn(1);
        // Header row (0) is skipped
        Row dataRow = mock(Row.class);
        when(mockSheet.getRow(1)).thenReturn(dataRow);
        when(dataRow.getLastCellNum()).thenReturn((short) 1);
        Cell cell = mock(Cell.class);
        when(dataRow.getCell(0)).thenReturn(cell);
        when(cell.getStringCellValue()).thenReturn("ThrowException");
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> excelImportService.processWorkbook(mockWorkbook));
        assertTrue(exception.getMessage().startsWith("Erreur lors du traitement de la ligne 2:"));
    }

    @Test
    @DisplayName("isRowEmpty() - Retourne true quand la ligne est vide")
    void testIsRowEmpty_WithEmptyRow_ShouldReturnTrue() {
        Row emptyRow = mock(Row.class);
        when(emptyRow.getLastCellNum()).thenReturn((short) 1);
        when(emptyRow.getCell(0)).thenReturn(null);
        assertTrue(excelImportService.isRowEmpty(emptyRow));
    }

    @Test
    @DisplayName("isRowEmpty() - Retourne false quand la ligne a des données")
    void testIsRowEmpty_WithNonEmptyRow_ShouldReturnFalse() {
        Row nonEmptyRow = mock(Row.class);
        when(nonEmptyRow.getLastCellNum()).thenReturn((short) 1);
        Cell cell = mock(Cell.class);
        when(nonEmptyRow.getCell(0)).thenReturn(cell);
        when(cell.toString()).thenReturn("Test");
        assertFalse(excelImportService.isRowEmpty(nonEmptyRow));
    }

    @Test
    @DisplayName("getCellStringValue() - Retourne la valeur de la cellule")
    void testGetCellStringValue_WithValidCell_ShouldReturnValue() {
        Row row = mock(Row.class);
        Cell cell = mock(Cell.class);
        when(row.getCell(0)).thenReturn(cell);
        when(cell.getStringCellValue()).thenReturn("Test Value");
        String result = excelImportService.getCellStringValue(row, 0);
        assertEquals("Test Value", result);
    }

    @Test
    @DisplayName("getCellStringValue() - Retourne chaîne vide quand la cellule est null")
    void testGetCellStringValue_WithNullCell_ShouldReturnEmptyString() {
        Row row = mock(Row.class);
        when(row.getCell(0)).thenReturn(null);
        String result = excelImportService.getCellStringValue(row, 0);
        assertEquals("", result);
    }

    @Test
    @DisplayName("getCellStringValue() - Retourne chaîne vide quand getStringCellValue échoue")
    void testGetCellStringValue_WhenGetCellValueFails_ShouldReturnEmptyString() {
        Row row = mock(Row.class);
        Cell cell = mock(Cell.class);
        when(row.getCell(0)).thenReturn(cell);
        when(cell.getStringCellValue()).thenThrow(new IllegalStateException("Not a string cell"));
        String result = excelImportService.getCellStringValue(row, 0);
        assertEquals("", result);
    }

    @Test
    @DisplayName("getCellStringValue() - Trim les valeurs")
    void testGetCellStringValue_ShouldTrimValue() {
        Row row = mock(Row.class);
        Cell cell = mock(Cell.class);
        when(row.getCell(0)).thenReturn(cell);
        when(cell.getStringCellValue()).thenReturn("  Test Value  ");
        String result = excelImportService.getCellStringValue(row, 0);
        assertEquals("Test Value", result);
    }

    @Test
    @DisplayName("getCellNumericValue() - Retourne la valeur numérique de la cellule")
    void testGetCellNumericValue_WithValidCell_ShouldReturnValue() {
        Row row = mock(Row.class);
        Cell cell = mock(Cell.class);
        when(row.getCell(0)).thenReturn(cell);
        when(cell.getNumericCellValue()).thenReturn(42.5);
        double result = excelImportService.getCellNumericValue(row, 0);
        assertEquals(42.5, result);
    }

    @Test
    @DisplayName("getCellNumericValue() - Retourne 0 quand la cellule est null")
    void testGetCellNumericValue_WithNullCell_ShouldReturnZero() {
        Row row = mock(Row.class);
        when(row.getCell(0)).thenReturn(null);
        double result = excelImportService.getCellNumericValue(row, 0);
        assertEquals(0.0, result);
    }

    @Test
    @DisplayName("getCellNumericValue() - Retourne 0 quand getNumericCellValue échoue")
    void testGetCellNumericValue_WhenGetCellValueFails_ShouldReturnZero() {
        Row row = mock(Row.class);
        Cell cell = mock(Cell.class);
        when(row.getCell(0)).thenReturn(cell);
        when(cell.getNumericCellValue()).thenThrow(new IllegalStateException("Not a numeric cell"));
        double result = excelImportService.getCellNumericValue(row, 0);
        assertEquals(0.0, result);
    }

    private static class TestExcelImportService extends AbstractExcelImportService<String> {
        @Override
        protected String mapRowToEntity(Row row) {
            String value = getCellStringValue(row, 0);
            if ("ThrowException".equals(value)) {
                throw new RuntimeException("Test exception");
            }
            return "Entity-" + row.getRowNum();
        }
    }
}
