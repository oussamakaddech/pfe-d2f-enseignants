package esprit.pfe.serviceformation.services;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ExportExcelService - noms d'onglets uniques")
class ExportExcelSheetNameTest {

    @Test
    @DisplayName("Deux formations de même titre (casse comprise) : onglets distincts, 31 caractères max")
    void duplicateTitlesGetDistinctSheets() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            wb.createSheet(ExportExcelService.uniqueSheetName(wb, "Machine Learning"));
            String second = ExportExcelService.uniqueSheetName(wb, "machine learning");
            wb.createSheet(second);
            assertThat(second).isEqualTo("machine learning (2)");

            String longTitle = "Formation avancée en architecture logicielle distribuée";
            wb.createSheet(ExportExcelService.uniqueSheetName(wb, longTitle));
            String longSecond = ExportExcelService.uniqueSheetName(wb, longTitle);
            wb.createSheet(longSecond);
            assertThat(longSecond).hasSizeLessThanOrEqualTo(31).endsWith(" (2)");
            assertThat(ExportExcelService.uniqueSheetName(wb, " ")).isEqualTo("Formation");
        }
    }
}
