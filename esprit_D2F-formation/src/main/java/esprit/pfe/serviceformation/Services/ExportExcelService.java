package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.sql.Time;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExportExcelService {
    private final FormationWorkflowService formationWorkflowService;

    public ByteArrayOutputStream exportFormationsAvance(Date startDate, Date endDate) throws IOException {
        List<FormationDTO> formations = formationWorkflowService.getAllFormationWorkflows();
        List<SeanceExport> allSeances = extractFilteredSeances(formations, startDate, endDate);

        Workbook workbook = new XSSFWorkbook();
        createCalendarSheet(workbook, allSeances, startDate, endDate);
        createParticipantSheets(workbook, formations);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (workbook) {
            workbook.write(out);
        }
        return out;
    }

    private List<SeanceExport> extractFilteredSeances(List<FormationDTO> formations, Date startDate, Date endDate) {
        List<SeanceExport> allSeances = new ArrayList<>();
        for (FormationDTO formation : formations) {
            if (formation.getSeances() != null) {
                addFilteredSeances(allSeances, formation, startDate, endDate);
            }
        }
        allSeances.sort(Comparator.comparing((SeanceExport s) -> s.dateSeance).thenComparing(s -> s.heureDebut));
        return allSeances;
    }

    private void addFilteredSeances(List<SeanceExport> allSeances, FormationDTO formation, Date startDate, Date endDate) {
        for (SeanceDTO seance : formation.getSeances()) {
            Date dateSeance = seance.getDateSeance();
            if (dateSeance != null && !dateSeance.before(startDate) && !dateSeance.after(endDate)) {
                allSeances.add(mapToSeanceExport(formation, seance));
            }
        }
    }

    private SeanceExport mapToSeanceExport(FormationDTO formation, SeanceDTO seance) {
        SeanceExport exp = new SeanceExport();
        exp.dateSeance = seance.getDateSeance();
        exp.heureDebut = seance.getHeureDebut();
        exp.heureFin = seance.getHeureFin();
        exp.salle = seance.getSalle();
        exp.titreFormation = formation.getTitreFormation();
        exp.formateurs = formatFormateurs(seance);
        exp.equipe = formatEquipe(formation);
        return exp;
    }

    private String formatFormateurs(SeanceDTO seance) {
        return Optional.ofNullable(seance.getAnimateurs())
                .orElse(Collections.emptyList())
                .stream()
                .map(a -> a.getNom() + " " + a.getPrenom())
                .collect(Collectors.joining(", "));
    }

    private String formatEquipe(FormationDTO formation) {
        String dept = Optional.ofNullable(formation.getDepartement1()).map(DeptDTO::getLibelle).orElse("");
        String up = Optional.ofNullable(formation.getUp1()).map(UpDTO::getLibelle).orElse("");
        return dept + " / " + up;
    }

    private void createCalendarSheet(Workbook workbook, List<SeanceExport> allSeances, Date startDate, Date endDate) {
        Sheet sheet = workbook.createSheet("Calendrier Avancé");
        Map<Date, List<SeanceExport>> mapByDate = groupSeancesByDate(allSeances);

        CellStyle titleStyle = createTitleStyle(workbook);
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle dateCellStyle = createDateCellStyle(workbook);
        CellStyle spacingStyle = createSpacingStyle(workbook);

        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String titrePeriode = formatPeriodTitle(startDate, endDate, df);

        writeCalendarTitle(sheet, titrePeriode, titleStyle);

        int rowIndex = 2;
        writeCalendarHeaders(sheet, rowIndex++, headerStyle);

        fillCalendarData(sheet, mapByDate, rowIndex, spacingStyle, dateCellStyle, df);

        for (int col = 0; col < 9; col++) {
            sheet.setColumnWidth(col, 20 * 256);
        }
    }

    private Map<Date, List<SeanceExport>> groupSeancesByDate(List<SeanceExport> allSeances) {
        Map<Date, List<SeanceExport>> mapByDate = new LinkedHashMap<>();
        for (SeanceExport s : allSeances) {
            mapByDate.computeIfAbsent(s.dateSeance, k -> new ArrayList<>()).add(s);
        }
        return mapByDate;
    }

    private String formatPeriodTitle(Date startDate, Date endDate, DateTimeFormatter df) {
        return "Calendrier des formations du "
                + startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().format(df)
                + " au "
                + endDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().format(df);
    }

    private void writeCalendarTitle(Sheet sheet, String title, CellStyle titleStyle) {
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(title);
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 8));
    }

    private void writeCalendarHeaders(Sheet sheet, int rowIndex, CellStyle headerStyle) {
        Row headerRow = sheet.createRow(rowIndex);
        String[] headers = {"Date", "Formation", "Formateur(s)", "Équipe (Dept/UP)", "Horaire", "Salle", "Num Séance"};
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
    }

    private void fillCalendarData(Sheet sheet, Map<Date, List<SeanceExport>> mapByDate, int rowIndex, CellStyle spacingStyle, CellStyle dateCellStyle, DateTimeFormatter df) {
        boolean firstGroup = true;
        for (Map.Entry<Date, List<SeanceExport>> entry : mapByDate.entrySet()) {
            if (!firstGroup) {
                Row spacer = sheet.createRow(rowIndex++);
                spacer.createCell(0).setCellStyle(spacingStyle);
            }
            firstGroup = false;
            int groupStart = rowIndex;
            rowIndex = writeSeancesForDate(sheet, entry.getValue(), rowIndex, spacingStyle);
            int groupEnd = rowIndex - 1;
            applyDateMerging(sheet, entry.getKey(), groupStart, groupEnd, dateCellStyle, df);
        }
    }

    private int writeSeancesForDate(Sheet sheet, List<SeanceExport> list, int rowIndex, CellStyle spacingStyle) {
        int total = list.size();
        int idx = 0;
        for (SeanceExport s : list) {
            idx++;
            Row r = sheet.createRow(rowIndex++);
            writeSeanceRow(r, s, idx, total);
            if (isAfternoonSeance(s)) {
                Row blank = sheet.createRow(rowIndex++);
                blank.createCell(0).setCellStyle(spacingStyle);
            }
        }
        return rowIndex;
    }

    private boolean isAfternoonSeance(SeanceExport s) {
        return s.heureDebut != null && s.heureDebut.after(Time.valueOf("12:30:00"));
    }

    private void writeSeanceRow(Row r, SeanceExport s, int idx, int total) {
        r.createCell(1).setCellValue(s.titreFormation);
        r.createCell(2).setCellValue(s.formateurs);
        r.createCell(3).setCellValue(s.equipe);
        String hd = s.heureDebut != null ? s.heureDebut.toString() : "";
        String hf = s.heureFin != null ? s.heureFin.toString() : "";
        r.createCell(4).setCellValue(hd + " - " + hf);
        r.createCell(5).setCellValue(Optional.ofNullable(s.salle).orElse(""));
        r.createCell(6).setCellValue(idx + "/" + total);
    }

    private void applyDateMerging(Sheet sheet, Date date, int groupStart, int groupEnd, CellStyle dateCellStyle, DateTimeFormatter df) {
        if (groupEnd > groupStart) {
            sheet.addMergedRegion(new CellRangeAddress(groupStart, groupEnd, 0, 0));
        }
        Row row = sheet.getRow(groupStart);
        if (row == null) row = sheet.createRow(groupStart);
        Cell dc = row.createCell(0);
        dc.setCellValue(date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().format(df));
        dc.setCellStyle(dateCellStyle);
    }

    private void createParticipantSheets(Workbook workbook, List<FormationDTO> formations) {
        Map<String, Set<ParticipantDTO>> sheetDataParFormation = collectParticipantData(formations);

        CellStyle headStyle = createHeaderStyle(workbook);
        for (Map.Entry<String, Set<ParticipantDTO>> entry : sheetDataParFormation.entrySet()) {
            createParticipantSheet(workbook, entry.getKey(), entry.getValue(), headStyle);
        }
    }

    private Map<String, Set<ParticipantDTO>> collectParticipantData(List<FormationDTO> formations) {
        Map<String, Set<ParticipantDTO>> sheetDataParFormation = new LinkedHashMap<>();
        for (FormationDTO formation : formations) {
            if (formation.getSeances() == null) continue;
            Set<ParticipantDTO> participants = collectFormationParticipants(formation);
            if (!participants.isEmpty()) {
                sheetDataParFormation.put(formation.getTitreFormation(), participants);
            }
        }
        return sheetDataParFormation;
    }

    private Set<ParticipantDTO> collectFormationParticipants(FormationDTO formation) {
        Set<ParticipantDTO> participants = new LinkedHashSet<>();
        for (SeanceDTO seance : formation.getSeances()) {
            if (seance.getParticipants() != null) {
                for (EnseignantDTO e : seance.getParticipants()) {
                    ParticipantDTO p = new ParticipantDTO();
                    p.setNom(e.getNom());
                    p.setPrenom(e.getPrenom());
                    p.setMail(e.getMail());
                    participants.add(p);
                }
            }
        }
        return participants;
    }

    private void createParticipantSheet(Workbook workbook, String sheetName, Set<ParticipantDTO> participants, CellStyle headStyle) {
        String safeName = WorkbookUtil.createSafeSheetName(sheetName);
        Sheet sh = workbook.createSheet(safeName);
        Row h = sh.createRow(0);
        String[] cols = {"Nom", "Prénom", "Email"};
        for (int i = 0; i < cols.length; i++) {
            Cell c = h.createCell(i);
            c.setCellValue(cols[i]);
            c.setCellStyle(headStyle);
        }
        int rIdx = 1;
        for (ParticipantDTO p : participants) {
            Row row = sh.createRow(rIdx++);
            row.createCell(0).setCellValue(p.getNom());
            row.createCell(1).setCellValue(p.getPrenom());
            row.createCell(2).setCellValue(p.getMail());
        }
        for (int col = 0; col < 3; col++) {
            sh.setColumnWidth(col, 20 * 256);
        }
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createDateCellStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createSpacingStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    static class SeanceExport {
        Date dateSeance;
        Time heureDebut;
        Time heureFin;
        String salle;
        String titreFormation;
        String formateurs;
        String equipe;
    }
}
