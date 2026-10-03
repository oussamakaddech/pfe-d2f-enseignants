package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFPrintSetup;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExportExcelService {
    private final FormationWorkflowService formationWorkflowService;

    // Couleurs RGB réelles. Un `short` était interprété comme un INDICE de la
    // palette Excel (0-64) : des valeurs comme 0x1F4E79 étant hors palette,
    // Excel affichait des cases NOIRES. On passe donc de vraies couleurs ARGB.
    private static final byte[] RGB_DARK_BLUE = {(byte) 0x1F, (byte) 0x4E, (byte) 0x79};
    private static final byte[] RGB_LIGHT_BLUE = {(byte) 0xBD, (byte) 0xD7, (byte) 0xEE};
    private static final byte[] RGB_DATE_BG = {(byte) 0xDA, (byte) 0xE3, (byte) 0xF3};
    private static final byte[] RGB_ALT_ROW = {(byte) 0xDE, (byte) 0xEA, (byte) 0xF1};
    private static final byte[] RGB_BORDER = {(byte) 0xB8, (byte) 0xCC, (byte) 0xE4};
    private static final byte[] RGB_HEADER_BORDER = {(byte) 0x2E, (byte) 0x75, (byte) 0xB6};

    /** Remplissage uni avec une couleur RGB (jamais un indice de palette). */
    private static void setFillColor(CellStyle style, byte[] rgb) {
        if (style instanceof XSSFCellStyle xssfStyle) {
            xssfStyle.setFillForegroundColor(new XSSFColor(rgb, null));
        }
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    }

    private static void setAllBorders(CellStyle style, BorderStyle borderStyle, byte[] rgb) {
        style.setBorderTop(borderStyle);
        style.setBorderBottom(borderStyle);
        style.setBorderLeft(borderStyle);
        style.setBorderRight(borderStyle);
        if (style instanceof XSSFCellStyle xssfStyle) {
            XSSFColor color = new XSSFColor(rgb, null);
            xssfStyle.setTopBorderColor(color);
            xssfStyle.setBottomBorderColor(color);
            xssfStyle.setLeftBorderColor(color);
            xssfStyle.setRightBorderColor(color);
        }
    }

    public ByteArrayOutputStream exportFormationsAvance(LocalDate startDate, LocalDate endDate) throws IOException {
        List<FormationResponseDTO> formations = formationWorkflowService.getAllFormationWorkflows();
        List<SeanceExport> allSeances = extractFilteredSeances(formations, startDate, endDate);

        Workbook workbook = new XSSFWorkbook();
        createSummarySheet(workbook, formations, allSeances, startDate, endDate);
        createCalendarSheet(workbook, allSeances, startDate, endDate);
        createParticipantSheets(workbook, formations);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (workbook) {
            workbook.write(out);
        }
        return out;
    }

    private void createSummarySheet(Workbook workbook, List<FormationResponseDTO> formations,
                                     List<SeanceExport> allSeances, LocalDate startDate, LocalDate endDate) {
        Sheet sheet = workbook.createSheet("Résumé");

        CellStyle titleStyle = createSummaryTitleStyle(workbook);
        CellStyle subtitleStyle = createSummarySubtitleStyle(workbook);
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle dataStyle = createDataCellStyle(workbook);
        CellStyle altStyle = createAlternateRowStyle(workbook);

        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Tableau de Bord des Formations");
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 1));

        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String dateRange = formatDateRange(startDate, endDate, df);
        Row subtitleRow = sheet.createRow(1);
        Cell subtitleCell = subtitleRow.createCell(0);
        subtitleCell.setCellValue(dateRange);
        subtitleCell.setCellStyle(subtitleStyle);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 1));

        String[] statLabels = {
            "Total Formations",
            "Total Sessions",
            "Total Participants",
            "Date Début",
            "Date Fin",
            "Date Génération"
        };

        int totalParticipants = countUniqueParticipants(formations);
        String[] statValues = {
            String.valueOf(countFormationsWithSeances(formations)),
            String.valueOf(allSeances.size()),
            String.valueOf(totalParticipants),
            formatDate(startDate, df),
            formatDate(endDate, df),
            java.time.LocalDate.now(ZoneId.systemDefault()).format(df)
        };

        Row headerRow = sheet.createRow(3);
        Cell h1 = headerRow.createCell(0);
        h1.setCellValue("Indicateur");
        h1.setCellStyle(headerStyle);
        Cell h2 = headerRow.createCell(1);
        h2.setCellValue("Valeur");
        h2.setCellStyle(headerStyle);

        for (int i = 0; i < statLabels.length; i++) {
            Row row = sheet.createRow(4 + i);
            Cell labelCell = row.createCell(0);
            labelCell.setCellValue(statLabels[i]);
            labelCell.setCellStyle(i % 2 == 0 ? dataStyle : altStyle);

            Cell valueCell = row.createCell(1);
            valueCell.setCellValue(statValues[i]);
            valueCell.setCellStyle(i % 2 == 0 ? dataStyle : altStyle);
        }

        sheet.setColumnWidth(0, 18 * 256);
        sheet.setColumnWidth(1, 25 * 256);
        sheet.createFreezePane(0, 4);
    }

    private int countFormationsWithSeances(List<FormationResponseDTO> formations) {
        return (int) formations.stream()
                .filter(f -> f.getSeances() != null && !f.getSeances().isEmpty())
                .count();
    }

    private int countUniqueParticipants(List<FormationResponseDTO> formations) {
        Set<String> uniqueParticipants = new HashSet<>();
        for (FormationResponseDTO f : formations) {
            if (f.getSeances() == null) continue;
            for (SeanceDTO s : f.getSeances()) {
                if (s.getParticipants() == null) continue;
                for (EnseignantDTO e : s.getParticipants()) {
                    if (e.getMail() != null) {
                        uniqueParticipants.add(e.getMail());
                    }
                }
            }
        }
        return uniqueParticipants.size();
    }

    private void createCalendarSheet(Workbook workbook, List<SeanceExport> allSeances,
                                      LocalDate startDate, LocalDate endDate) {
        Sheet sheet = workbook.createSheet("Calendrier");

        Map<LocalDate, List<SeanceExport>> mapByDate = groupSeancesByDate(allSeances);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String dateRange = formatDateRange(startDate, endDate, df);

        CellStyle titleStyle = createCalendarTitleStyle(workbook);
        CellStyle subtitleStyle = createCalendarSubtitleStyle(workbook);
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle dateCellStyle = createDateCellStyle(workbook);
        CellStyle spacingStyle = createSpacingStyle(workbook);
        CellStyle dataStyle = createDataCellStyle(workbook);
        CellStyle altStyle = createAlternateRowStyle(workbook);

        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Calendrier des Formations");
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));

        Row subtitleRow = sheet.createRow(1);
        Cell subtitleCell = subtitleRow.createCell(0);
        subtitleCell.setCellValue(dateRange);
        subtitleCell.setCellStyle(subtitleStyle);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 6));

        Row headerRow = sheet.createRow(2);
        String[] headers = {"Date", "Formation", "Formateur(s)", "Équipe (Dept/UP)", "Horaire", "Salle", "Séance"};
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int rowIndex = 3;
        boolean firstGroup = true;
        for (Map.Entry<LocalDate, List<SeanceExport>> entry : mapByDate.entrySet()) {
            if (!firstGroup) {
                Row spacer = sheet.createRow(rowIndex++);
                spacer.createCell(0).setCellStyle(spacingStyle);
            }
            firstGroup = false;

            int groupStart = rowIndex;
            List<SeanceExport> seances = entry.getValue();
            int total = seances.size();
            int idx = 0;

            for (SeanceExport s : seances) {
                idx++;
                Row r = sheet.createRow(rowIndex);
                boolean isAlt = (rowIndex % 2 == 0);
                CellStyle rowStyle = isAlt ? altStyle : dataStyle;
                writeSeanceRow(r, s, rowStyle);

                if (isAfternoonSeance(s) && idx < total) {
                    rowIndex++;
                    Row blank = sheet.createRow(rowIndex);
                    blank.createCell(0).setCellStyle(spacingStyle);
                }
                rowIndex++;
            }

            int groupEnd = rowIndex - 1;
            applyDateMerging(sheet, entry.getKey(), groupStart, groupEnd, dateCellStyle, df);
        }

        int[] columnWidths = {15 * 256, 35 * 256, 25 * 256, 20 * 256, 15 * 256, 12 * 256, 8 * 256};
        for (int i = 0; i < columnWidths.length; i++) {
            sheet.setColumnWidth(i, columnWidths[i]);
        }

        sheet.setAutoFilter(new CellRangeAddress(2, sheet.getLastRowNum(), 0, 6));
        sheet.createFreezePane(0, 3);

        setupPageSetup(sheet);
    }

    private void writeSeanceRow(Row r, SeanceExport s, CellStyle style) {
        Cell c1 = r.createCell(1);
        c1.setCellValue(s.titreFormation);
        c1.setCellStyle(style);

        Cell c2 = r.createCell(2);
        c2.setCellValue(s.formateurs);
        c2.setCellStyle(style);

        Cell c3 = r.createCell(3);
        c3.setCellValue(s.equipe);
        c3.setCellStyle(style);

        String hd = s.heureDebut != null ? s.heureDebut.toString().substring(0, 5) : "";
        String hf = s.heureFin != null ? s.heureFin.toString().substring(0, 5) : "";
        Cell c4 = r.createCell(4);
        c4.setCellValue(hd + " - " + hf);
        c4.setCellStyle(style);

        Cell c5 = r.createCell(5);
        c5.setCellValue(Optional.ofNullable(s.salle).orElse("À définir"));
        c5.setCellStyle(style);

        Cell c6 = r.createCell(6);
        c6.setCellValue(formatSeanceLabel(s));
        c6.setCellStyle(style);
    }

    /**
     * Libellé de la colonne « Séance » : la numérotation RÉELLE de la séance
     * dans la formation (« 3/6 »), et non un index recalculé par journée qui
     * affichait systématiquement « 1/1 ».
     */
    private String formatSeanceLabel(SeanceExport s) {
        if (s.numeroSeance == null) {
            return "-";
        }
        if (s.totalSeances == null || s.totalSeances <= 0) {
            return String.valueOf(s.numeroSeance);
        }
        return s.numeroSeance + "/" + s.totalSeances;
    }

    private void applyDateMerging(Sheet sheet, LocalDate date, int groupStart, int groupEnd,
                                   CellStyle dateCellStyle, DateTimeFormatter df) {
        if (groupEnd > groupStart) {
            sheet.addMergedRegion(new CellRangeAddress(groupStart, groupEnd, 0, 0));
        }
        Row row = sheet.getRow(groupStart);
        if (row == null) row = sheet.createRow(groupStart);
        Cell dc = row.createCell(0);
        dc.setCellValue(formatDate(date, df));
        dc.setCellStyle(dateCellStyle);
    }

    private void createParticipantSheets(Workbook workbook, List<FormationResponseDTO> formations) {
        Map<String, Set<ParticipantDTO>> sheetData = collectParticipantData(formations);
        CellStyle headerStyle = createHeaderStyle(workbook);

        for (Map.Entry<String, Set<ParticipantDTO>> entry : sheetData.entrySet()) {
            createParticipantSheet(workbook, entry.getKey(), entry.getValue(), headerStyle);
        }
    }

    private Map<String, Set<ParticipantDTO>> collectParticipantData(List<FormationResponseDTO> formations) {
        Map<String, Set<ParticipantDTO>> result = new LinkedHashMap<>();
        for (FormationResponseDTO formation : formations) {
            if (formation.getSeances() == null) continue;
            Set<ParticipantDTO> participants = collectFormationParticipants(formation);
            if (!participants.isEmpty()) {
                result.put(formation.getTitreFormation(), participants);
            }
        }
        return result;
    }

    private Set<ParticipantDTO> collectFormationParticipants(FormationResponseDTO formation) {
        Set<ParticipantDTO> participants = new LinkedHashSet<>();
        for (SeanceDTO seance : formation.getSeances()) {
            if (seance.getParticipants() == null) continue;
            for (EnseignantDTO e : seance.getParticipants()) {
                ParticipantDTO p = new ParticipantDTO();
                p.setNom(e.getNom());
                p.setPrenom(e.getPrenom());
                p.setMail(e.getMail());
                participants.add(p);
            }
        }
        return participants;
    }

    private void createParticipantSheet(Workbook workbook, String sheetName,
                                         Set<ParticipantDTO> participants, CellStyle headStyle) {
        String baseName = WorkbookUtil.createSafeSheetName(sheetName);
        String safeName = baseName.length() > 31 ? baseName.substring(0, 31) : baseName;
        Sheet sh = workbook.createSheet(safeName);

        CellStyle dataStyle = createDataCellStyle(workbook);
        CellStyle altStyle = createAlternateRowStyle(workbook);
        CellStyle totalStyle = createTotalRowStyle(workbook);

        Row headerRow = sh.createRow(0);
        String[] cols = {"N°", "Nom", "Prénom", "Email", "Statut"};
        for (int i = 0; i < cols.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(cols[i]);
            c.setCellStyle(headStyle);
        }

        int rIdx = 1;
        int num = 1;
        for (ParticipantDTO p : participants) {
            Row row = sh.createRow(rIdx);
            CellStyle rowStyle = (rIdx % 2 == 1) ? dataStyle : altStyle;

            Cell c0 = row.createCell(0);
            c0.setCellValue(num);
            c0.setCellStyle(rowStyle);

            Cell c1 = row.createCell(1);
            c1.setCellValue(p.getNom());
            c1.setCellStyle(rowStyle);

            Cell c2 = row.createCell(2);
            c2.setCellValue(p.getPrenom());
            c2.setCellStyle(rowStyle);

            Cell c3 = row.createCell(3);
            c3.setCellValue(p.getMail());
            c3.setCellStyle(rowStyle);

            Cell c4 = row.createCell(4);
            c4.setCellValue("Inscrit");
            c4.setCellStyle(rowStyle);

            rIdx++;
            num++;
        }

        int totalRow = rIdx;
        Row totalRowObj = sh.createRow(totalRow);
        Cell totalLabel = totalRowObj.createCell(0);
        totalLabel.setCellValue("Total Participants");
        totalLabel.setCellStyle(totalStyle);

        Cell totalValue = totalRowObj.createCell(1);
        totalValue.setCellValue(participants.size());
        totalValue.setCellStyle(totalStyle);

        sh.setColumnWidth(0, 8 * 256);
        sh.setColumnWidth(1, 20 * 256);
        sh.setColumnWidth(2, 20 * 256);
        sh.setColumnWidth(3, 35 * 256);
        sh.setColumnWidth(4, 12 * 256);

        sh.setAutoFilter(new CellRangeAddress(0, totalRow, 0, 4));
        sh.createFreezePane(0, 1);
    }

    private List<SeanceExport> extractFilteredSeances(List<FormationResponseDTO> formations,
                                                        LocalDate startDate, LocalDate endDate) {
        List<SeanceExport> allSeances = new ArrayList<>();
        for (FormationResponseDTO formation : formations) {
            if (formation.getSeances() != null) {
                addFilteredSeances(allSeances, formation, startDate, endDate);
            }
        }
        allSeances.sort(Comparator.comparing((SeanceExport s) -> s.dateSeance)
                .thenComparing(s -> s.heureDebut));
        return allSeances;
    }

    private void addFilteredSeances(List<SeanceExport> allSeances, FormationResponseDTO formation,
                                     LocalDate startDate, LocalDate endDate) {
        // Numérotation calculée sur TOUTES les séances de la formation (et non sur
        // celles de la seule journée) : « 3/6 » au lieu d'un « 1/1 » systématique.
        List<SeanceDTO> ordered = orderedSeances(formation);
        int total = ordered.size();
        for (int i = 0; i < total; i++) {
            SeanceDTO seance = ordered.get(i);
            LocalDate dateSeance = seance.getDateSeance();
            if (dateSeance != null && !dateSeance.isBefore(startDate) && !dateSeance.isAfter(endDate)) {
                allSeances.add(mapToSeanceExport(formation, seance, i + 1, total));
            }
        }
    }

    /** Séances d'une formation triées chronologiquement (date, heure, id). */
    private List<SeanceDTO> orderedSeances(FormationResponseDTO formation) {
        List<SeanceDTO> seances = new ArrayList<>(formation.getSeances());
        seances.sort(Comparator
                .comparing(SeanceDTO::getDateSeance, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(SeanceDTO::getHeureDebut, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(SeanceDTO::getIdSeance, Comparator.nullsLast(Comparator.naturalOrder())));
        return seances;
    }

    private SeanceExport mapToSeanceExport(FormationResponseDTO formation, SeanceDTO seance,
                                           int ordre, int total) {
        SeanceExport exp = new SeanceExport();
        exp.dateSeance = seance.getDateSeance();
        exp.heureDebut = seance.getHeureDebut();
        exp.heureFin = seance.getHeureFin();
        // Salle : celle de la séance, sinon celle de la formation (jamais perdue).
        exp.salle = firstNonBlank(seance.getSalle(), formation.getSalle());
        exp.titreFormation = formation.getTitreFormation();
        // Animateurs : ceux de la séance, sinon ceux de la formation.
        exp.formateurs = firstNonBlank(formatFormateurs(seance), formatFormateurs(formation));
        exp.equipe = formatEquipe(formation);
        exp.numeroSeance = seance.getNumeroSeance() != null ? seance.getNumeroSeance() : ordre;
        exp.totalSeances = seance.getTotalSeances() != null ? seance.getTotalSeances() : total;
        return exp;
    }

    /** Première valeur non vide (repli de colonne). */
    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second != null && !second.isBlank() ? second : null;
    }

    private String formatFormateurs(SeanceDTO seance) {
        return Optional.ofNullable(seance.getAnimateurs())
                .orElse(Collections.emptyList())
                .stream()
                .map(a -> a.getNom() + " " + a.getPrenom())
                .collect(Collectors.joining(", "));
    }

    /** Animateurs de la formation (repli quand la séance n'en porte aucun). */
    private String formatFormateurs(FormationResponseDTO formation) {
        return Optional.ofNullable(formation.getAnimateurs())
                .orElse(Collections.emptyList())
                .stream()
                .map(a -> a.getNom() + " " + a.getPrenom())
                .collect(Collectors.joining(", "));
    }

    private String formatEquipe(FormationResponseDTO formation) {
        String dept = Optional.ofNullable(formation.getDepartement())
                .map(DeptDTO::getLibelle).orElse("");
        String up = Optional.ofNullable(formation.getUp())
                .map(UpDTO::getLibelle).orElse("");
        return dept + " / " + up;
    }

    private Map<LocalDate, List<SeanceExport>> groupSeancesByDate(List<SeanceExport> allSeances) {
        Map<LocalDate, List<SeanceExport>> mapByDate = new LinkedHashMap<>();
        for (SeanceExport s : allSeances) {
            mapByDate.computeIfAbsent(s.dateSeance, k -> new ArrayList<>()).add(s);
        }
        return mapByDate;
    }

    private boolean isAfternoonSeance(SeanceExport s) {
        return s.heureDebut != null && s.heureDebut.isAfter(LocalTime.of(12, 30));
    }

    private void setupPageSetup(Sheet sheet) {
        if (sheet instanceof org.apache.poi.xssf.usermodel.XSSFSheet xssfSheet) {
            XSSFPrintSetup printSetup = xssfSheet.getPrintSetup();
            printSetup.setLandscape(true);
            printSetup.setFitWidth((short) 1);
            printSetup.setFitHeight((short) 0);
            printSetup.setOrientation(org.apache.poi.ss.usermodel.PrintOrientation.LANDSCAPE);

            sheet.setRepeatingRows(new CellRangeAddress(0, 2, 0, 6));

            Header header = sheet.getHeader();
            header.setCenter("Calendrier des Formations");

            Footer footer = sheet.getFooter();
            footer.setRight("Page &[Page] of &[Pages]");
        }
    }

    private String formatDateRange(LocalDate startDate, LocalDate endDate, DateTimeFormatter df) {
        return "Période: " + formatDate(startDate, df) + " au " + formatDate(endDate, df);
    }

    private String formatDate(LocalDate date, DateTimeFormatter df) {
        return date.format(df);
    }

    private CellStyle createCalendarTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setFillColor(style, RGB_DARK_BLUE);
        style.setWrapText(true);
        setAllBorders(style, BorderStyle.MEDIUM, RGB_HEADER_BORDER);
        return style;
    }

    private CellStyle createCalendarSubtitleStyle(Workbook workbook) {
        return createLightBlueSubtitleStyle(workbook);
    }

    private CellStyle createLightBlueSubtitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 11);
        font.setColor(IndexedColors.BLACK.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setFillColor(style, RGB_LIGHT_BLUE);
        style.setWrapText(true);
        setAllBorders(style, BorderStyle.MEDIUM, RGB_HEADER_BORDER);
        return style;
    }

    private CellStyle createSummaryTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 18);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setFillColor(style, RGB_DARK_BLUE);
        style.setWrapText(true);
        setAllBorders(style, BorderStyle.MEDIUM, RGB_HEADER_BORDER);
        return style;
    }

    private CellStyle createSummarySubtitleStyle(Workbook workbook) {
        return createLightBlueSubtitleStyle(workbook);
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        setFillColor(style, RGB_DARK_BLUE);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        setAllBorders(style, BorderStyle.MEDIUM, RGB_HEADER_BORDER);
        return style;
    }

    private CellStyle createDateCellStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        setFillColor(style, RGB_DATE_BG);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setAllBorders(style, BorderStyle.THIN, RGB_BORDER);
        return style;
    }

    private CellStyle createSpacingStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.WHITE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderTop(BorderStyle.NONE);
        style.setBorderBottom(BorderStyle.NONE);
        style.setBorderLeft(BorderStyle.NONE);
        style.setBorderRight(BorderStyle.NONE);
        return style;
    }

    private CellStyle createDataCellStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        setAllBorders(style, BorderStyle.THIN, RGB_BORDER);
        return style;
    }

    private CellStyle createAlternateRowStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        setFillColor(style, RGB_ALT_ROW);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        setAllBorders(style, BorderStyle.THIN, RGB_BORDER);
        return style;
    }

    private CellStyle createTotalRowStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        setFillColor(style, RGB_DATE_BG);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setAllBorders(style, BorderStyle.MEDIUM, RGB_HEADER_BORDER);
        return style;
    }

    static class SeanceExport {
        LocalDate dateSeance;
        LocalTime heureDebut;
        LocalTime heureFin;
        String salle;
        String titreFormation;
        String formateurs;
        String equipe;
        Integer numeroSeance;
        Integer totalSeances;
    }
}