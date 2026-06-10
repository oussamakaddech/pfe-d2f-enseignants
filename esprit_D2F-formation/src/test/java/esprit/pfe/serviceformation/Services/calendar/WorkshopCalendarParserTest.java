package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.dto.calendar.ParsedCalendarDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedSessionDTO;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("WorkshopCalendarParser - parsing planning + participants")
class WorkshopCalendarParserTest {

    private final WorkshopCalendarParser parser = new WorkshopCalendarParser(new CalendarProperties());

    private void writeRow(Sheet sheet, int rowNum, String... cells) {
        Row row = sheet.createRow(rowNum);
        for (int i = 0; i < cells.length; i++) {
            if (cells[i] != null) {
                row.createCell(i).setCellValue(cells[i]);
            }
        }
    }

    @Test
    @DisplayName("Extrait les séances (date/créneau/Séance X/Y/statut) et les participants par section")
    void parsesScheduleAndParticipants() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Planning");
            writeRow(sheet, 0, "Date", "Formation", "Animateur", "Salle", "Statut", "Créneau", "Séance");
            writeRow(sheet, 1, "10/06/2026", "Java Avancé", "Ben Ali", "Salle A", "Teams", "09:00-12:00", "Séance 1/3");
            writeRow(sheet, 2, "11/06/2026", "Java Avancé", "Ben Ali", "Salle A", "Ouverte", "09:00-12:00", "Séance 2/3");
            // Section participants
            writeRow(sheet, 4, "Java Avancé");
            writeRow(sheet, 5, "alice@esprit.tn");
            writeRow(sheet, 6, "bob@esprit.tn");

            ParsedCalendarDTO result = parser.parse(workbook);

            assertThat(result.getSessions()).hasSize(2);
            ParsedSessionDTO first = result.getSessions().get(0);
            assertThat(first.getFormationName()).isEqualTo("Java Avancé");
            assertThat(first.getRoom()).isEqualTo("Salle A");
            assertThat(first.getStatus()).isEqualTo("TEAMS");
            assertThat(first.getStartTime().toString()).isEqualTo("09:00");
            assertThat(first.getEndTime().toString()).isEqualTo("12:00");
            assertThat(first.getSessionNumber()).isEqualTo(1);
            assertThat(first.getTotalSessions()).isEqualTo(3);
            assertThat(result.getSessions().get(1).getStatus()).isEqualTo("OPEN");

            assertThat(result.getParticipants())
                    .extracting("email")
                    .containsExactlyInAnyOrder("alice@esprit.tn", "bob@esprit.tn");
            assertThat(result.getParticipants()).allMatch(p -> p.getFormationName().equals("Java Avancé"));
        }
    }

    @Test
    @DisplayName("Signale une erreur quand l'en-tête du planning est introuvable")
    void reportsMissingHeader() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Vide");
            writeRow(sheet, 0, "Colonne1", "Colonne2");

            ParsedCalendarDTO result = parser.parse(workbook);

            assertThat(result.getSessions()).isEmpty();
            assertThat(result.getErrors()).anyMatch(e -> e.getField().equals("header"));
        }
    }
}
