package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.sql.Time;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExportExcelService {
    @Autowired
    private FormationWorkflowService formationWorkflowService;

    public ByteArrayOutputStream exportFormationsAvance(Date startDate, Date endDate) throws IOException {

        // 1) Récupérer la liste de formations
        List<FormationDTO> formations = formationWorkflowService.getAllFormationWorkflows();

        // 2) Construire une liste à plat de séances filtrées par période
        List<SeanceExport> allSeances = new ArrayList<>();
        for (FormationDTO formation : formations) {
            if (formation.getSeances() != null) {
                for (SeanceDTO seance : formation.getSeances()) {
                    if (seance.getDateSeance() == null) continue;
                    Date dateSeance = seance.getDateSeance();
                    if (dateSeance.before(startDate) || dateSeance.after(endDate)) continue;
                    SeanceExport exp = new SeanceExport();
                    exp.dateSeance     = dateSeance;
                    exp.heureDebut     = seance.getHeureDebut();
                    exp.heureFin       = seance.getHeureFin();
                    exp.salle          = seance.getSalle();
                    exp.titreFormation = formation.getTitreFormation();
                    exp.formateurs     = Optional.ofNullable(seance.getAnimateurs())
                            .orElse(Collections.emptyList())
                            .stream()
                            .map(a -> a.getNom() + " " + a.getPrenom())
                            .collect(Collectors.joining(", "));
                    String equipe =
                            Optional.ofNullable(formation.getDepartement1())
                                    .map(DeptDTO::getLibelle)
                                    .orElse("")
                                    + " / "
                                    + Optional.ofNullable(formation.getUp1())
                                    .map(UpDTO::getLibelle)
                                    .orElse("");
                    exp.equipe = equipe;
                    allSeances.add(exp);
                }
            }
        }

        // 3) Tri
        allSeances.sort(Comparator
                .comparing((SeanceExport s) -> s.dateSeance)
                .thenComparing(s -> s.heureDebut)
        );

        // 4) Groupement par date
        Map<Date,List<SeanceExport>> mapByDate = new LinkedHashMap<>();
        for (SeanceExport s : allSeances) {
            mapByDate.computeIfAbsent(s.dateSeance, k -> new ArrayList<>())
                    .add(s);
        }

        // 5) Création du Workbook et de la première feuille
        Workbook workbook = new XSSFWorkbook();
        Sheet sheetCalendar = workbook.createSheet("Calendrier Avancé");

        // Styles…
        CellStyle titleStyle = workbook.createCellStyle();
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short)16);
        titleFont.setColor(IndexedColors.WHITE.getIndex());
        titleStyle.setFont(titleFont);
        titleStyle.setAlignment(HorizontalAlignment.CENTER);
        titleStyle.setFillForegroundColor(IndexedColors.BLUE.getIndex());
        titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle dateCellStyle = workbook.createCellStyle();
        dateCellStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        dateCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        dateCellStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle spacingStyle = workbook.createCellStyle();
        spacingStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        spacingStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        // Titre
        SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy");
        String titrePeriode = "Calendrier des formations du "
                + df.format(startDate) + " au " + df.format(endDate);
        Row titleRow = sheetCalendar.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(titrePeriode);
        titleCell.setCellStyle(titleStyle);
        sheetCalendar.addMergedRegion(new CellRangeAddress(0,0,0,8));

        // En-tête
        int rowIndex = 2;
        Row headerRow = sheetCalendar.createRow(rowIndex++);
        String[] headers = {
                "Date","Formation","Formateur(s)","Équipe (Dept/UP)",
                "Horaire","Salle","Num Séance"
        };
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        // Données
        boolean firstGroup = true;
        for (Map.Entry<Date,List<SeanceExport>> entry : mapByDate.entrySet()) {
            Date date = entry.getKey();
            List<SeanceExport> list = entry.getValue();
            if (!firstGroup) {
                Row spacer = sheetCalendar.createRow(rowIndex++);
                spacer.createCell(0).setCellStyle(spacingStyle);
            }
            firstGroup = false;
            int groupStart = rowIndex;
            int total = list.size(), idx = 0;
            for (SeanceExport s : list) {
                idx++;
                Row r = sheetCalendar.createRow(rowIndex++);
                r.createCell(1).setCellValue(s.titreFormation);
                r.createCell(2).setCellValue(s.formateurs);
                r.createCell(3).setCellValue(s.equipe);
                String hd = s.heureDebut != null ? s.heureDebut.toString() : "";
                String hf = s.heureFin   != null ? s.heureFin.toString()   : "";
                r.createCell(4).setCellValue(hd + " - " + hf);
                r.createCell(5).setCellValue(Optional.ofNullable(s.salle).orElse(""));
                r.createCell(6).setCellValue(idx + "/" + total);
                // r.createCell(7).setCellValue("Début: " + hd + " - Fin: " + hf);
                if (s.heureDebut != null && s.heureDebut.after(Time.valueOf("12:30:00"))) {
                    Row blank = sheetCalendar.createRow(rowIndex++);
                    blank.createCell(0).setCellStyle(spacingStyle);
                }
            }
            int groupEnd = rowIndex - 1;
            if (groupEnd > groupStart) {
                sheetCalendar.addMergedRegion(new CellRangeAddress(groupStart, groupEnd, 0, 0));
                Row first = sheetCalendar.getRow(groupStart);
                Cell dc = first.createCell(0);
                dc.setCellValue(df.format(date));
                dc.setCellStyle(dateCellStyle);
            } else {
                Row only = sheetCalendar.getRow(groupStart);
                Cell dc = only.createCell(0);
                dc.setCellValue(df.format(date));
                dc.setCellStyle(dateCellStyle);
            }
        }

        // → largeur colonnes 0 à 8
        for (int col = 0; col < 9; col++) {
            sheetCalendar.setColumnWidth(col, 20 * 256);
        }


        // 6) Feuilles par formation : une sheet = une formation, avec Nom / Prénom / Email
        Map<String, Set<ParticipantDTO>> sheetDataParFormation = new LinkedHashMap<>();
        for (FormationDTO formation : formations) {
            if (formation.getSeances() == null) continue;
            Set<ParticipantDTO> participants = new LinkedHashSet<>();
            for (SeanceDTO seance : formation.getSeances()) {
                for (EnseignantDTO e : seance.getParticipants()) {
                    ParticipantDTO p = new ParticipantDTO();    // constructeur sans argument

                    p.setNom(e.getNom());
                    p.setPrenom(e.getPrenom());
                    p.setMail(e.getMail());                     // ou setEmail(...) selon votre DTO
                    participants.add(p);
                }

            }
            sheetDataParFormation.put(formation.getTitreFormation(), participants);
        }

        for (Map.Entry<String, Set<ParticipantDTO>> entry : sheetDataParFormation.entrySet()) {
            String safeName = WorkbookUtil.createSafeSheetName(entry.getKey());
            Sheet sh = workbook.createSheet(safeName);

            // En-tête
            Row h = sh.createRow(0);
            CellStyle headStyle = workbook.createCellStyle();
            Font headFont = workbook.createFont();
            headFont.setBold(true);
            headStyle.setFont(headFont);
            headStyle.setAlignment(HorizontalAlignment.CENTER);
            String[] cols = { "Nom", "Prénom", "Email" };
            for (int i = 0; i < cols.length; i++) {
                Cell c = h.createCell(i);
                c.setCellValue(cols[i]);
                c.setCellStyle(headStyle);
            }

            // Lignes participants
            int rIdx = 1;
            for (ParticipantDTO p : entry.getValue()) {
                Row row = sh.createRow(rIdx++);
                row.createCell(0).setCellValue(p.getNom());
                row.createCell(1).setCellValue(p.getPrenom());
                row.createCell(2).setCellValue(p.getMail());
            }

            // Ajuster largeur
            for (int col = 0; col < 3; col++) {
                sh.setColumnWidth(col, 20 * 256);
            }
        }

        // Écriture finale
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        return out;
    }

    static class SeanceExport {
        Date   dateSeance;
        Time   heureDebut;
        Time   heureFin;
        String salle;
        String titreFormation;
        String formateurs;
        String equipe;
    }
}
