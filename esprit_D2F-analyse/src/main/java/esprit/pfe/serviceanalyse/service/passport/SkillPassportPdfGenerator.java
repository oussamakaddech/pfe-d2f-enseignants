package esprit.pfe.serviceanalyse.service.passport;

import com.itextpdf.kernel.colors.Color;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import esprit.pfe.serviceanalyse.dto.passport.*;
import esprit.pfe.serviceanalyse.exception.PdfGenerationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Génère un PDF "Passeport de Compétences" professionnel via iText 7.
 *
 * Palette couleurs :
 *   - Bleu principal  #1A3A6B  (institution)
 *   - Vert succès     #27AE60  (niveaux hauts, validé)
 *   - Orange warning  #E67E22  (niveaux moyens)
 *   - Rouge danger    #C0392B  (gaps élevés)
 *   - Gris fond       #F2F4F8
 */
@Slf4j
@Service
public class SkillPassportPdfGenerator {

    private static final String SAVOIR_DEFAULT = "Savoir";

    // ── Palette ─────────────────────────────────────────────────────────
    private static final Color BLUE_PRIMARY   = new DeviceRgb(26,  58,  107);
    private static final Color BLUE_LIGHT     = new DeviceRgb(41,  128, 185);
    private static final Color GREEN_SUCCESS  = new DeviceRgb(39,  174, 96);
    private static final Color ORANGE_WARN    = new DeviceRgb(230, 126, 34);
    private static final Color RED_DANGER     = new DeviceRgb(192, 57,  43);
    private static final Color GRAY_BG        = new DeviceRgb(242, 244, 248);
    private static final Color GRAY_TEXT      = new DeviceRgb(100, 110, 130);
    private static final Color WHITE          = new DeviceRgb(255, 255, 255);
    private static final Color DARK_TEXT      = new DeviceRgb(30,  40,  60);

    public byte[] generate(TeacherSkillPassportDTO passport) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);
            doc.setMargins(40, 45, 40, 45);

            PdfFont fontRegular = PdfFontFactory.createFont();
            PdfFont fontBold    = PdfFontFactory.createFont("Helvetica-Bold");

            // ── Sections ────────────────────────────────────────────────
            addHeader(doc, passport, fontBold, fontRegular);
            addIdentitySection(doc, passport.getIdentity(), fontBold, fontRegular);
            addGlobalSummary(doc, passport, fontBold, fontRegular);
            addDomainsSection(doc, passport.getDomaines(), fontBold, fontRegular);
            addFormationsSection(doc, passport.getFormations(), fontBold, fontRegular);
            addCertificationsSection(doc, passport.getCertifications(), fontBold, fontRegular);
            addGapsSection(doc, passport.getGaps(), fontBold, fontRegular);
            addRecommendationsSection(doc, passport.getRecommandations(), fontBold, fontRegular);
            addFooter(doc, passport.getDateGeneration(), fontRegular);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erreur génération PDF passeport : {}", e.getMessage(), e);
            throw new PdfGenerationException("Échec génération PDF : " + e.getMessage(), e);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    //  EN-TÊTE
    // ────────────────────────────────────────────────────────────────────
    private void addHeader(Document doc, TeacherSkillPassportDTO passport,
                           PdfFont bold, PdfFont regular) throws IOException {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                .setWidth(UnitValue.createPercentValue(100))
                .setBackgroundColor(BLUE_PRIMARY)
                .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(8))
                .setMarginBottom(20);

        // Colonne gauche : titre
        Cell leftCell = new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPadding(20);
        leftCell.add(new Paragraph("ESPRIT – École Supérieure Privée d'Ingénierie")
                .setFont(regular).setFontSize(9).setFontColor(new DeviceRgb(180, 200, 230)));
        leftCell.add(new Paragraph("Passeport de Compétences")
                .setFont(bold).setFontSize(22).setFontColor(WHITE).setMarginTop(4));
        leftCell.add(new Paragraph("Développement Professionnel des Enseignants — D2F")
                .setFont(regular).setFontSize(10).setFontColor(new DeviceRgb(180, 200, 230)));
        headerTable.addCell(leftCell);

        // Colonne droite : score global
        double score = passport.getScoreGlobal();
        Cell rightCell = new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPadding(20)
                .setTextAlignment(TextAlignment.CENTER);
        rightCell.add(new Paragraph(String.format("%.1f / 5", score))
                .setFont(bold).setFontSize(28).setFontColor(scoreColor(score)));
        rightCell.add(new Paragraph("Score global")
                .setFont(regular).setFontSize(9).setFontColor(new DeviceRgb(180, 200, 230)));
        rightCell.add(new Paragraph(statutBadge(passport.getStatut()))
                .setFont(bold).setFontSize(9).setFontColor(WHITE)
                .setBackgroundColor(statutColor(passport.getStatut()))
                .setPadding(4).setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(4)));
        headerTable.addCell(rightCell);

        doc.add(headerTable);
    }

    // ────────────────────────────────────────────────────────────────────
    //  IDENTITÉ ENSEIGNANT
    // ────────────────────────────────────────────────────────────────────
    private void addIdentitySection(Document doc, TeacherIdentityDTO identity,
                                    PdfFont bold, PdfFont regular) {
        addSectionTitle(doc, "1.  Informations de l'Enseignant", bold);

        Table t = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(16);

        addInfoRow(t, "Nom & Prénom", safeConcat(identity.getPrenom(), identity.getNom()), bold, regular);
        addInfoRow(t, "Email", safe(identity.getEmail()), bold, regular);
        addInfoRow(t, "Identifiant", safe(identity.getUsername()), bold, regular);
        addInfoRow(t, "Rôle", safe(identity.getRole()), bold, regular);
        addInfoRow(t, "Téléphone", safe(identity.getTelephone()), bold, regular);

        doc.add(t);
    }

    // ────────────────────────────────────────────────────────────────────
    //  RÉSUMÉ GLOBAL
    // ────────────────────────────────────────────────────────────────────
    private void addGlobalSummary(Document doc, TeacherSkillPassportDTO passport,
                                  PdfFont bold, PdfFont regular) {
        addSectionTitle(doc, "2.  Résumé Global", bold);

        Table t = new Table(UnitValue.createPercentArray(new float[]{25, 25, 25, 25}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(16);

        addKpiCell(t, String.valueOf(passport.getTotalSavoirsMaitrises()), "Savoirs maîtrisés", bold, regular, BLUE_LIGHT);
        addKpiCell(t, String.valueOf(passport.getTotalFormations()),         "Formations suivies",  bold, regular, GREEN_SUCCESS);
        addKpiCell(t, String.valueOf(passport.getTotalCertifications()),     "Certifications",       bold, regular, ORANGE_WARN);
        addKpiCell(t, String.valueOf(passport.getTotalGaps()),               "Gaps détectés",        bold, regular, RED_DANGER);

        doc.add(t);
    }

    // ────────────────────────────────────────────────────────────────────
    //  DOMAINES ET COMPÉTENCES
    // ────────────────────────────────────────────────────────────────────
    private void addDomainsSection(Document doc, List<DomainSummaryDTO> domaines,
                                   PdfFont bold, PdfFont regular) {
        addSectionTitle(doc, "3.  Domaines & Compétences Maîtrisés", bold);

        if (domaines == null || domaines.isEmpty()) {
            doc.add(italicPara("Aucune compétence enregistrée.", regular));
            return;
        }

        for (DomainSummaryDTO domaine : domaines) {
            // Titre domaine
            Paragraph domTitle = new Paragraph("▸  " + safe(domaine.getNom())
                    + "   (" + String.format("%.1f", domaine.getScoreGlobal()) + "/5 — "
                    + domaine.getTotalSavoirs() + " savoirs)")
                    .setFont(bold).setFontSize(11).setFontColor(BLUE_PRIMARY)
                    .setBackgroundColor(GRAY_BG).setPadding(6)
                    .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(4))
                    .setMarginTop(8).setMarginBottom(4);
            doc.add(domTitle);

            if (domaine.getCompetences() == null) continue;

            // Tableau des savoirs
            Table savoirTable = new Table(UnitValue.createPercentArray(new float[]{30, 22, 16, 16, 16}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setFontSize(9).setMarginBottom(8);

            addTableHeader(savoirTable, new String[]{"Compétence", SAVOIR_DEFAULT, "Type", "Niveau", "Date"}, bold);

            for (CompetenceSummaryDTO comp : domaine.getCompetences()) {
                if (comp.getSavoirs() == null) continue;
                for (SavoirSummaryDTO savoir : comp.getSavoirs()) {
                    savoirTable.addCell(cellData(safe(comp.getNom()), regular));
                    savoirTable.addCell(cellData(safe(savoir.getNom()), regular));
                    savoirTable.addCell(cellData(formatType(savoir.getType()), regular));
                    savoirTable.addCell(cellNiveau(safe(savoir.getNiveauLabel()), savoir.getNiveauNumeric(), bold));
                    savoirTable.addCell(cellData(safe(savoir.getDateAcquisition()), regular));
                }
            }
            doc.add(savoirTable);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    //  FORMATIONS SUIVIES
    // ────────────────────────────────────────────────────────────────────
    private void addFormationsSection(Document doc, List<TrainingHistoryDTO> formations,
                                      PdfFont bold, PdfFont regular) {
        addSectionTitle(doc, "4.  Formations Suivies", bold);

        if (formations == null || formations.isEmpty()) {
            doc.add(italicPara("Aucune formation enregistrée.", regular));
            return;
        }

        Table t = new Table(UnitValue.createPercentArray(new float[]{38, 18, 18, 14, 12}))
                .setWidth(UnitValue.createPercentValue(100))
                .setFontSize(9).setMarginBottom(16);

        addTableHeader(t, new String[]{"Formation", "Début", "Fin", "Durée", "Statut"}, bold);

        for (TrainingHistoryDTO f : formations) {
            t.addCell(cellData(safe(f.getTitre()), regular));
            t.addCell(cellData(safe(f.getDateDebut()), regular));
            t.addCell(cellData(safe(f.getDateFin()), regular));
            t.addCell(cellData(safe(f.getDuree()), regular));
            t.addCell(cellStatut(safe(f.getStatut()), bold));
        }
        doc.add(t);
    }

    // ────────────────────────────────────────────────────────────────────
    //  CERTIFICATIONS
    // ────────────────────────────────────────────────────────────────────
    private void addCertificationsSection(Document doc, List<CertificationSummaryDTO> certs,
                                          PdfFont bold, PdfFont regular) {
        addSectionTitle(doc, "5.  Certifications Obtenues", bold);

        if (certs == null || certs.isEmpty()) {
            doc.add(italicPara("Aucune certification enregistrée.", regular));
            return;
        }

        Table t = new Table(UnitValue.createPercentArray(new float[]{50, 25, 25}))
                .setWidth(UnitValue.createPercentValue(100))
                .setFontSize(9).setMarginBottom(16);

        addTableHeader(t, new String[]{"Formation certifiante", "Type", "Date d'obtention"}, bold);

        for (CertificationSummaryDTO c : certs) {
            t.addCell(cellData(safe(c.getTitreFormation()), regular));
            t.addCell(cellData(formatTypeCertif(c.getTypeCertif()), regular));
            t.addCell(cellData(safe(c.getDateObtention()), regular));
        }
        doc.add(t);
    }

    // ────────────────────────────────────────────────────────────────────
    //  GAPS PRIORITAIRES
    // ────────────────────────────────────────────────────────────────────
    private void addGapsSection(Document doc, List<SkillGapSummaryDTO> gaps,
                                PdfFont bold, PdfFont regular) {
        addSectionTitle(doc, "6.  Gaps Prioritaires Détectés", bold);

        if (gaps == null || gaps.isEmpty()) {
            Paragraph ok = new Paragraph("✓  Aucun gap critique détecté — profil complet.")
                    .setFont(bold).setFontSize(10).setFontColor(GREEN_SUCCESS)
                    .setBackgroundColor(new DeviceRgb(232, 245, 233))
                    .setPadding(10).setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6))
                    .setMarginBottom(16);
            doc.add(ok);
            return;
        }

        Table t = new Table(UnitValue.createPercentArray(new float[]{30, 14, 14, 14, 14, 14}))
                .setWidth(UnitValue.createPercentValue(100))
                .setFontSize(9).setMarginBottom(16);

        addTableHeader(t, new String[]{"Compétence", "Actuel", "Cible", "Écart", "Gravité", "Explication"}, bold);

        for (SkillGapSummaryDTO g : gaps) {
            t.addCell(cellData(safe(g.getCompetenceLabel()), regular));
            t.addCell(cellData(niveauBarText(g.getNiveauActuel()), regular));
            t.addCell(cellData(niveauBarText(g.getNiveauCible()), regular));
            t.addCell(cellData(String.format("%.0f", g.getGap()), regular));
            t.addCell(cellGravite(safe(g.getGravite()), bold));
            t.addCell(cellData(truncate(safe(g.getExplication()), 60), regular));
        }
        doc.add(t);
    }

    // ────────────────────────────────────────────────────────────────────
    //  RECOMMANDATIONS
    // ────────────────────────────────────────────────────────────────────
    private void addRecommendationsSection(Document doc, List<RecommendationSummaryDTO> recos,
                                           PdfFont bold, PdfFont regular) {
        addSectionTitle(doc, "7.  Recommandations de Formations", bold);

        if (recos == null || recos.isEmpty()) {
            doc.add(italicPara("Aucune recommandation disponible.", regular));
            return;
        }

        int rank = 1;
        for (RecommendationSummaryDTO r : recos) {
            Table rTable = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginBottom(8)
                    .setBorder(new SolidBorder(BLUE_LIGHT, 0.5f))
                    .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6));

            Cell leftCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setPadding(10);
            leftCell.add(new Paragraph(rank + ".  " + safe(r.getTitre()))
                    .setFont(bold).setFontSize(10).setFontColor(BLUE_PRIMARY));
            leftCell.add(new Paragraph(safe(r.getJustification()))
                    .setFont(regular).setFontSize(8).setFontColor(GRAY_TEXT));
            if (r.getCompetencesCiblees() != null && !r.getCompetencesCiblees().isEmpty()) {
                leftCell.add(new Paragraph("Compétences : " + String.join(", ", r.getCompetencesCiblees()))
                        .setFont(regular).setFontSize(8).setFontColor(GRAY_TEXT));
            }

            Cell rightCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                    .setPadding(10).setTextAlignment(TextAlignment.RIGHT);
            rightCell.add(new Paragraph(safe(r.getDuree()))
                    .setFont(regular).setFontSize(9).setFontColor(GRAY_TEXT));
            rightCell.add(new Paragraph(String.format("%.0f%%", r.getProbabiliteReussite() * 100) + " réussite")
                    .setFont(bold).setFontSize(10).setFontColor(GREEN_SUCCESS));
            rightCell.add(new Paragraph(prioriteLabel(r.getPriorite()))
                    .setFont(bold).setFontSize(8).setFontColor(WHITE)
                    .setBackgroundColor(prioriteColor(r.getPriorite()))
                    .setPadding(3).setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(3)));

            rTable.addCell(leftCell);
            rTable.addCell(rightCell);
            doc.add(rTable);
            rank++;
        }
        doc.add(new Paragraph("").setMarginBottom(8));
    }

    // ────────────────────────────────────────────────────────────────────
    //  PIED DE PAGE
    // ────────────────────────────────────────────────────────────────────
    private void addFooter(Document doc, String dateGeneration, PdfFont regular) {
        doc.add(new com.itextpdf.layout.element.LineSeparator(
                new com.itextpdf.kernel.pdf.canvas.draw.SolidLine(0.5f)));
        doc.add(new Paragraph(
                "Document généré le " + safe(dateGeneration) +
                " | Plateforme D2F – Développement Professionnel des Enseignants | ESPRIT")
                .setFont(regular).setFontSize(7).setFontColor(GRAY_TEXT)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(6));
    }

    // ────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ────────────────────────────────────────────────────────────────────
    private void addSectionTitle(Document doc, String title, PdfFont bold) {
        doc.add(new Paragraph(title)
                .setFont(bold).setFontSize(12).setFontColor(WHITE)
                .setBackgroundColor(BLUE_PRIMARY)
                .setPadding(8)
                .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6))
                .setMarginTop(14).setMarginBottom(8));
    }

    private void addTableHeader(Table t, String[] headers, PdfFont bold) {
        for (String h : headers) {
            t.addCell(new Cell()
                    .add(new Paragraph(h).setFont(bold).setFontSize(9).setFontColor(WHITE))
                    .setBackgroundColor(BLUE_LIGHT)
                    .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                    .setPadding(5));
        }
    }

    private void addInfoRow(Table t, String label, String value, PdfFont bold, PdfFont regular) {
        t.addCell(new Cell()
                .add(new Paragraph(label).setFont(bold).setFontSize(9).setFontColor(GRAY_TEXT))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setBackgroundColor(GRAY_BG).setPadding(6));
        t.addCell(new Cell()
                .add(new Paragraph(safe(value)).setFont(regular).setFontSize(9).setFontColor(DARK_TEXT))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPadding(6));
    }

    private void addKpiCell(Table t, String value, String label, PdfFont bold, PdfFont regular, Color color) {
        Cell cell = new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setBackgroundColor(GRAY_BG)
                .setPadding(12)
                .setTextAlignment(TextAlignment.CENTER)
                .setBorderRadius(new com.itextpdf.layout.properties.BorderRadius(6))
                .setMargin(4);
        cell.add(new Paragraph(safe(value)).setFont(bold).setFontSize(24).setFontColor(color));
        cell.add(new Paragraph(label).setFont(regular).setFontSize(8).setFontColor(GRAY_TEXT));
        t.addCell(cell);
    }

    private Cell cellData(String value, PdfFont regular) {
        return new Cell()
                .add(new Paragraph(safe(value)).setFont(regular).setFontSize(8).setFontColor(DARK_TEXT))
                .setBorder(new SolidBorder(GRAY_BG, 0.5f))
                .setPadding(4);
    }

    private Cell cellNiveau(String label, int niveau, PdfFont bold) {
        Color c;
        if (niveau >= 4) {
            c = GREEN_SUCCESS;
        } else if (niveau >= 3) {
            c = ORANGE_WARN;
        } else {
            c = RED_DANGER;
        }
        return new Cell()
                .add(new Paragraph(label).setFont(bold).setFontSize(7).setFontColor(c))
                .setBorder(new SolidBorder(GRAY_BG, 0.5f))
                .setPadding(4);
    }

    private Cell cellStatut(String statut, PdfFont bold) {
        Color c;
        if (statut.contains("TERMINEE") || statut.contains("VALIDE")) {
            c = GREEN_SUCCESS;
        } else if (statut.contains("COURS")) {
            c = ORANGE_WARN;
        } else {
            c = GRAY_TEXT;
        }
        return new Cell()
                .add(new Paragraph(statut).setFont(bold).setFontSize(7).setFontColor(c))
                .setBorder(new SolidBorder(GRAY_BG, 0.5f))
                .setPadding(4);
    }

    private Cell cellGravite(String gravite, PdfFont bold) {
        Color c;
        if (gravite.contains("lev")) {
            c = RED_DANGER;
        } else if (gravite.contains("moy")) {
            c = ORANGE_WARN;
        } else {
            c = GREEN_SUCCESS;
        }
        return new Cell()
                .add(new Paragraph(gravite.toUpperCase()).setFont(bold).setFontSize(7).setFontColor(c))
                .setBorder(new SolidBorder(GRAY_BG, 0.5f))
                .setPadding(4);
    }

    private Paragraph italicPara(String text, PdfFont regular) {
        return new Paragraph(text)
                .setFont(regular).setFontSize(9).setFontColor(GRAY_TEXT)
                .setItalic().setMarginBottom(12);
    }

    private Color scoreColor(double score) {
        if (score >= 4.0) return GREEN_SUCCESS;
        if (score >= 3.0) return ORANGE_WARN;
        return RED_DANGER;
    }

    private Color statutColor(String statut) {
        if (statut == null) return GRAY_TEXT;
        if (statut.contains("maît")) return GREEN_SUCCESS;
        if (statut.contains("prog")) return ORANGE_WARN;
        return RED_DANGER;
    }

    private String statutBadge(String statut) {
        if (statut == null) return "INCONNU";
        return switch (statut) {
            case "maîtrisé"      -> "MAÎTRISÉ";
            case "en_progression" -> "EN PROGRESSION";
            case "à_risque"      -> "À RISQUE";
            default              -> statut.toUpperCase();
        };
    }

    private Color prioriteColor(String priorite) {
        if ("haute".equals(priorite)) return RED_DANGER;
        if ("moyenne".equals(priorite)) return ORANGE_WARN;
        return GRAY_TEXT;
    }

    private String prioriteLabel(String priorite) {
        if ("haute".equals(priorite)) return " PRIORITÉ HAUTE ";
        if ("moyenne".equals(priorite)) return " PRIORITÉ MOYENNE ";
        return " PRIORITÉ FAIBLE ";
    }

    private String formatType(String type) {
        if (type == null) return SAVOIR_DEFAULT;
        return switch (type) {
            case "SAVOIR_FAIRE" -> "Savoir-faire";
            case "SAVOIR_ETRE"  -> "Savoir-être";
            default             -> SAVOIR_DEFAULT;
        };
    }

    private String formatTypeCertif(String type) {
        if (type == null) return "";
        return switch (type) {
            case "CERTIF"       -> "Certificat";
            case "BADGE"        -> "Badge";
            case "ATTESTATION"  -> "Attestation";
            default             -> type;
        };
    }

    private String niveauBarText(int niveau) {
        return "N" + niveau + " (" + "★".repeat(Math.max(0, Math.min(5, niveau))) + ")";
    }

    private String safeConcat(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p != null && !p.isBlank() && !"null".equals(p)) {
                if (!sb.isEmpty()) sb.append(" ");
                sb.append(p);
            }
        }
        return sb.isEmpty() ? "—" : sb.toString();
    }

    private String safe(Object o) {
        if (o == null) return "—";
        String s = String.valueOf(o).trim();
        return (s.isEmpty() || "null".equals(s)) ? "—" : s;
    }

    private String truncate(String s, int maxLen) {
        if (s == null || s.length() <= maxLen) return safe(s);
        return s.substring(0, maxLen) + "…";
    }
}
