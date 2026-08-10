package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.dto.calendar.ImportRowErrorDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedCalendarDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedParticipantDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedSessionDTO;
import esprit.pfe.serviceformation.utils.CalendarParsingUtils;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Analyse un classeur Excel de calendrier d'ateliers et en extrait :
 * <ul>
 *   <li>les lignes de planning (feuille principale) ;</li>
 *   <li>les e-mails des participants (sections par formation).</li>
 * </ul>
 *
 * <h3>Stratégie de localisation des colonnes</h3>
 * Le parseur ne dépend d'aucune position de colonne en dur : il localise la
 * ligne d'en-tête puis chaque colonne par <b>mots-clés configurables</b>
 * ({@code calendar.import.header-keywords.*}). Cela le rend robuste aux
 * variations de mise en page. Ajuster ces mots-clés en configuration suffit à
 * couvrir un nouveau format de fichier.
 *
 * <h3>Sections participants</h3>
 * Après extraction du planning, le parseur balaie toutes les feuilles : tout
 * libellé correspondant à un intitulé de formation connu ouvre une section ;
 * les e-mails rencontrés ensuite y sont rattachés.
 */
@Component
@RequiredArgsConstructor
public class WorkshopCalendarParser {

    /** Nombre minimum de colonnes-clés pour qu'une ligne soit reconnue comme en-tête. */
    private static final int MIN_HEADER_MATCHES = 3;
    /** Nombre de lignes au sommet d'une feuille où l'on cherche l'en-tête. */
    private static final int HEADER_SCAN_DEPTH = 15;

    private static final DataFormatter FORMATTER = new DataFormatter(Locale.FRANCE);

    private final CalendarProperties properties;

    public ParsedCalendarDTO parse(Workbook workbook) {
        ParsedCalendarDTO result = ParsedCalendarDTO.builder().build();
        if (workbook.getNumberOfSheets() == 0) {
            result.getErrors().add(ImportRowErrorDTO.error(0, "workbook", "Classeur vide : aucune feuille."));
            return result;
        }

        // 1) Planning : on cherche la première feuille comportant un en-tête reconnaissable.
        ColumnMap columns = null;
        Sheet scheduleSheet = null;
        int headerRowIndex = -1;
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            Sheet sheet = workbook.getSheetAt(i);
            int hr = findHeaderRow(sheet);
            if (hr >= 0) {
                scheduleSheet = sheet;
                headerRowIndex = hr;
                columns = mapColumns(sheet.getRow(hr));
                break;
            }
        }

        if (columns == null) {
            result.getErrors().add(ImportRowErrorDTO.error(0, "header",
                    "En-tête du planning introuvable (colonnes attendues : date, formation, salle, créneau…)."));
            return result;
        }

        parseSessions(scheduleSheet, headerRowIndex, columns, result);

        // 2) Sections participants (toutes feuilles).
        Set<String> knownFormations = new HashSet<>();
        result.getSessions().forEach(s -> knownFormations.add(normalize(s.getFormationName())));
        parseParticipantSections(workbook, knownFormations, result);

        return result;
    }

    // ==================== PLANNING ====================

    private void parseSessions(Sheet sheet, int headerRowIndex, ColumnMap columns, ParsedCalendarDTO result) {
        int lastRow = sheet.getLastRowNum();
        int year = inferYear(sheet, headerRowIndex);
        LocalDate lastDate = null;
        for (int r = headerRowIndex + 1; r <= lastRow; r++) {
            lastDate = processScheduleRow(sheet.getRow(r), columns, result, year, lastDate, r);
        }
    }

    private LocalDate processScheduleRow(Row row, ColumnMap columns, ParsedCalendarDTO result,
                                         int year, LocalDate lastDate, int r) {
        if (row == null || isRowEmpty(row)) {
            return lastDate;
        }
        int humanRow = r + 1;
        String formationName = text(row, columns.formation);
        if (formationName.isBlank()) {
            return lastDate;
        }

        LocalDate effectiveDate = resolveDate(row, columns, year, lastDate, result, humanRow);
        if (effectiveDate == null) {
            return lastDate;
        }
        if (!text(row, columns.date).isBlank()) {
            lastDate = effectiveDate;
        }

        LocalTime[] slot = readTimeSlot(row, columns.timeSlot);
        if (slot == null) {
            result.getErrors().add(ImportRowErrorDTO.error(humanRow, "créneau",
                    "Créneau horaire manquant ou mal formé : « " + text(row, columns.timeSlot) + " »."));
            return lastDate;
        }

        ParsedSessionDTO session = ParsedSessionDTO.builder()
                .formationName(formationName)
                .trainerName(text(row, columns.trainer))
                .room(text(row, columns.room))
                .status(normalizeStatus(text(row, columns.status)))
                .date(effectiveDate)
                .startTime(slot[0])
                .endTime(slot[1])
                .sourceRow(humanRow)
                .build();

        applySession(session, row, columns, result, humanRow);
        result.getSessions().add(session);
        return lastDate;
    }

    private LocalDate resolveDate(Row row, ColumnMap columns, int year, LocalDate lastDate,
                                  ParsedCalendarDTO result, int humanRow) {
        Optional<LocalDate> date = readDate(row, columns.date, year);
        if (date.isPresent()) {
            return date.get();
        }
        if (lastDate != null) {
            return lastDate;
        }
        result.getErrors().add(ImportRowErrorDTO.error(humanRow, "date",
                "Date manquante ou mal formée : « " + text(row, columns.date) + " »."));
        return null;
    }

    private void applySession(ParsedSessionDTO session, Row row, ColumnMap columns,
                              ParsedCalendarDTO result, int humanRow) {
        String raw = columns.session >= 0 ? text(row, columns.session) : "";
        Optional<int[]> parsed = CalendarParsingUtils.parseSession(raw);
        if (parsed.isEmpty()) {
            // Repli : on balaie toute la ligne à la recherche d'un motif « X/Y ».
            for (Cell cell : row) {
                parsed = CalendarParsingUtils.parseSession(text(cell));
                if (parsed.isPresent()) {
                    break;
                }
            }
        }
        if (parsed.isPresent()) {
            session.setSessionNumber(parsed.get()[0]);
            session.setTotalSessions(parsed.get()[1]);
        } else if (columns.session >= 0 && !raw.isBlank()) {
            result.getErrors().add(ImportRowErrorDTO.warning(humanRow, "séance",
                    "Numérotation de séance non reconnue : « " + raw + " »."));
        }
    }

    // ==================== PARTICIPANTS ====================

    private void parseParticipantSections(Workbook workbook, Set<String> knownFormations,
                                          ParsedCalendarDTO result) {
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            parseSheetParticipants(workbook.getSheetAt(i), knownFormations, result);
        }
    }

    private void parseSheetParticipants(Sheet sheet, Set<String> knownFormations, ParsedCalendarDTO result) {
        String currentSection = null;
        for (Row row : sheet) {
            if (row == null) {
                continue;
            }
            int humanRow = row.getRowNum() + 1;
            List<String> emails = extractEmails(row);
            String rowText = joinNonEmail(row);

            if (emails.isEmpty()) {
                currentSection = updateSectionIfNeeded(rowText, knownFormations, currentSection);
            } else {
                processParticipantEmails(emails, humanRow, currentSection, result);
            }
        }
    }

    private String updateSectionIfNeeded(String rowText, Set<String> knownFormations, String currentSection) {
        if (!rowText.isBlank() && knownFormations.contains(normalize(rowText))) {
            return rowText;
        }
        return currentSection;
    }

    private void processParticipantEmails(List<String> emails, int humanRow, String currentSection,
                                          ParsedCalendarDTO result) {
        for (String email : emails) {
            if (!CalendarParsingUtils.isValidEmail(email)) {
                result.getErrors().add(ImportRowErrorDTO.warning(humanRow, "email",
                        "Adresse e-mail mal formée ignorée."));
            } else if (currentSection == null) {
                result.getErrors().add(ImportRowErrorDTO.warning(humanRow, "participant",
                        "Participant sans section de formation associée — ignoré."));
            } else {
                result.getParticipants().add(ParsedParticipantDTO.builder()
                        .formationName(currentSection)
                        .email(email.trim().toLowerCase(Locale.ROOT))
                        .sourceRow(humanRow)
                        .build());
            }
        }
    }

    // ==================== EN-TÊTE / COLONNES ====================

    private int findHeaderRow(Sheet sheet) {
        int depth = Math.min(HEADER_SCAN_DEPTH, sheet.getLastRowNum());
        for (int r = sheet.getFirstRowNum(); r <= depth; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            ColumnMap map = mapColumns(row);
            if (map.matchCount() >= MIN_HEADER_MATCHES && map.date >= 0 && map.formation >= 0) {
                return r;
            }
        }
        return -1;
    }

    private ColumnMap mapColumns(Row headerRow) {
        ColumnMap map = new ColumnMap();
        CalendarProperties.HeaderKeywords kw = properties.getImport().getHeaderKeywords();
        for (Cell cell : headerRow) {
            mapCellToColumn(map, cell, kw);
        }
        if (map.date < 0 && map.formation > 0) {
            map.date = inferDateColumn(map);
        }
        return map;
    }

    private void mapCellToColumn(ColumnMap map, Cell cell, CalendarProperties.HeaderKeywords kw) {
        String header = normalize(text(cell));
        if (header.isBlank()) {
            return;
        }
        int idx = cell.getColumnIndex();
        if (map.date < 0 && matchesAny(header, kw.getDate())) {
            map.date = idx;
        } else if (map.formation < 0 && matchesAny(header, kw.getFormation())) {
            map.formation = idx;
        } else if (map.trainer < 0 && matchesAny(header, kw.getTrainer())) {
            map.trainer = idx;
        } else if (map.room < 0 && matchesAny(header, kw.getRoom())) {
            map.room = idx;
        } else if (map.status < 0 && matchesAny(header, kw.getStatus())) {
            map.status = idx;
        } else if (map.timeSlot < 0 && matchesAny(header, kw.getTimeSlot())) {
            map.timeSlot = idx;
        } else if (map.session < 0 && matchesAny(header, kw.getSession())) {
            map.session = idx;
        }
    }

    /** Première colonne non attribuée à gauche de « formation » (sinon -1). */
    private int inferDateColumn(ColumnMap map) {
        Set<Integer> used = new HashSet<>(List.of(
                map.formation, map.trainer, map.room, map.status, map.timeSlot, map.session));
        for (int c = 0; c < map.formation; c++) {
            if (!used.contains(c)) {
                return c;
            }
        }
        return -1;
    }

    /**
     * Déduit l'année de référence du planning en cherchant un millésime (20xx)
     * dans le titre/les lignes situées au-dessus de l'en-tête ; à défaut, l'année
     * courante. Sert de repli quand la colonne date n'indique pas l'année.
     */
    private int inferYear(Sheet sheet, int headerRowIndex) {
        Pattern yearPattern = Pattern.compile("\\b(20\\d{2})\\b");
        for (int r = sheet.getFirstRowNum(); r <= headerRowIndex; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            for (Cell cell : row) {
                Matcher m = yearPattern.matcher(text(cell));
                if (m.find()) {
                    return Integer.parseInt(m.group(1));
                }
            }
        }
        return LocalDate.now(ZoneId.systemDefault()).getYear();
    }

    private boolean matchesAny(String normalizedHeader, List<String> keywords) {
        for (String k : keywords) {
            if (normalizedHeader.contains(normalize(k))) {
                return true;
            }
        }
        return false;
    }

    // ==================== LECTURE DE CELLULES ====================

    private Optional<LocalDate> readDate(Row row, int col, int year) {
        if (col < 0) {
            return Optional.empty();
        }
        Cell cell = row.getCell(col);
        if (cell == null) {
            return Optional.empty();
        }
        if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC
                && DateUtil.isCellDateFormatted(cell)) {
            return Optional.of(cell.getLocalDateTimeCellValue().toLocalDate());
        }
        return CalendarParsingUtils.parseFlexibleDate(text(cell), year);
    }

    private LocalTime[] readTimeSlot(Row row, int col) {
        if (col < 0) {
            return new LocalTime[0];
        }
        return CalendarParsingUtils.parseTimeSlot(text(row, col)).orElse(new LocalTime[0]);
    }

    private List<String> extractEmails(Row row) {
        List<String> emails = new ArrayList<>();
        for (Cell cell : row) {
            String value = text(cell);
            for (String token : value.split("[\\s,;]+")) {
                if (token.contains("@")) {
                    emails.add(token);
                }
            }
        }
        return emails;
    }

    private String joinNonEmail(Row row) {
        StringBuilder sb = new StringBuilder();
        for (Cell cell : row) {
            String value = text(cell);
            if (!value.isBlank() && !value.contains("@")) {
                if (!sb.isEmpty()) {
                    sb.append(' ');
                }
                sb.append(value);
            }
        }
        return sb.toString().trim();
    }

    private boolean isRowEmpty(Row row) {
        for (Cell cell : row) {
            if (!text(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String text(Row row, int col) {
        if (col < 0) {
            return "";
        }
        return text(row.getCell(col));
    }

    private String text(Cell cell) {
        if (cell == null) {
            return "";
        }
        return FORMATTER.formatCellValue(cell).trim();
    }

    private static String normalizeStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String n = normalize(raw);
        if (n.contains("teams") || n.contains("ligne") || n.contains("online")) return "TEAMS";
        if (n.contains("ferm") || n.contains("closed")) return "CLOSED";
        if (n.contains("ouvert") || n.contains("open")) return "OPEN";
        return raw.trim().toUpperCase(Locale.ROOT);
    }

    /** Minuscule + suppression des accents pour des comparaisons robustes. */
    private static String normalize(String s) {
        if (s == null) {
            return "";
        }
        String stripped = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return stripped.toLowerCase(Locale.ROOT).trim();
    }

    /** Indices de colonnes localisés par en-tête (-1 = absente). */
    private static final class ColumnMap {
        int date = -1;
        int formation = -1;
        int trainer = -1;
        int room = -1;
        int status = -1;
        int timeSlot = -1;
        int session = -1;

        int matchCount() {
            int c = 0;
            for (int idx : new int[]{date, formation, trainer, room, status, timeSlot, session}) {
                if (idx >= 0) c++;
            }
            return c;
        }
    }
}
