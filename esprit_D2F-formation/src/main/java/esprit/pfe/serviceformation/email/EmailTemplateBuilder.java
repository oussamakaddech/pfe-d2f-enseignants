package esprit.pfe.serviceformation.email;

import java.util.ArrayList;
import java.util.List;

/**
 * Constructeur unique de gabarits d'e-mails pour le service Formation.
 *
 * <p>Conçu pour un rendu fiable dans <strong>Outlook Desktop</strong> (moteur Word) :
 * mise en page par tables {@code role="presentation"}, styles 100 % <em>inline</em>,
 * et aucune propriété non supportée (pas de {@code linear-gradient}, {@code flex},
 * pseudo-éléments {@code ::before} ni {@code box-shadow} structurant). Une seule
 * source de vérité pour tous les e-mails du workflow de formation.</p>
 */
public final class EmailTemplateBuilder {

    private static final String FONT = "Arial,Helvetica,sans-serif";
    private static final String TEXT_COLOR = "#2c3e50";
    private static final String MUTED = "#7f8c8d";

    private String accentColor = "#1565c0";
    private String icon = "";
    private String title = "Notification";
    private String greetingName;          // null => "Bonjour,"
    private String intro = "";
    private final List<String[]> details = new ArrayList<>();  // {label, value}
    private final List<String> seanceLines = new ArrayList<>();
    private String note;                  // encart d'information optionnel (HTML de confiance)

    private EmailTemplateBuilder() {
    }

    public static EmailTemplateBuilder create() {
        return new EmailTemplateBuilder();
    }

    public EmailTemplateBuilder accentColor(String color) {
        if (color != null && !color.isBlank()) {
            this.accentColor = color;
        }
        return this;
    }

    public EmailTemplateBuilder icon(String value) {
        this.icon = value == null ? "" : value;
        return this;
    }

    public EmailTemplateBuilder title(String value) {
        if (value != null && !value.isBlank()) {
            this.title = value;
        }
        return this;
    }

    /** Nom du destinataire pour personnaliser l'accroche. {@code null}/vide => « Bonjour, ». */
    public EmailTemplateBuilder greetingName(String name) {
        this.greetingName = (name != null && !name.isBlank()) ? name.trim() : null;
        return this;
    }

    /** Message d'introduction (HTML de confiance autorisé : {@code <strong>} …). */
    public EmailTemplateBuilder intro(String message) {
        this.intro = message == null ? "" : message;
        return this;
    }

    public EmailTemplateBuilder detail(String label, String value) {
        details.add(new String[] { label, (value == null || value.isBlank()) ? "—" : value });
        return this;
    }

    /** Ajoute une ligne de séance déjà formatée (ex. « 12/06/2026 · 09:00–12:00 · Salle B12 »). */
    public EmailTemplateBuilder seance(String line) {
        if (line != null && !line.isBlank()) {
            seanceLines.add(line);
        }
        return this;
    }

    /** Encart d'information mis en évidence sous les détails (HTML de confiance autorisé). */
    public EmailTemplateBuilder note(String text) {
        this.note = text;
        return this;
    }

    public String build() {
        StringBuilder body = new StringBuilder();

        // Accroche
        String greeting = greetingName != null ? "Bonjour " + esc(greetingName) + "," : "Bonjour,";
        body.append("<p style=\"margin:0 0 18px;font-family:").append(FONT)
                .append(";font-size:16px;color:").append(TEXT_COLOR).append(";\">").append(greeting).append("</p>");

        // Message d'introduction (encart à liseré coloré)
        if (!intro.isBlank()) {
            body.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:0 0 24px;\"><tr>")
                    .append("<td style=\"border-left:4px solid ").append(accentColor)
                    .append(";background:#f5f7fa;padding:14px 18px;font-family:").append(FONT)
                    .append(";font-size:15px;line-height:1.6;color:").append(TEXT_COLOR).append(";\">")
                    .append(intro).append("</td></tr></table>");
        }

        // Détails (label / valeur)
        if (!details.isEmpty()) {
            body.append(sectionTitle("Informations de la formation"));
            body.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:0 0 8px;\">");
            for (String[] d : details) {
                body.append("<tr>")
                        .append("<td style=\"padding:7px 12px;border-bottom:1px solid #eceff1;font-family:").append(FONT)
                        .append(";font-size:13px;font-weight:bold;color:").append(accentColor)
                        .append(";white-space:nowrap;vertical-align:top;width:130px;\">").append(esc(d[0])).append("</td>")
                        .append("<td style=\"padding:7px 12px;border-bottom:1px solid #eceff1;font-family:").append(FONT)
                        .append(";font-size:14px;color:").append(TEXT_COLOR).append(";\">").append(esc(d[1])).append("</td>")
                        .append("</tr>");
            }
            body.append("</table>");
        }

        // Séances
        if (!seanceLines.isEmpty()) {
            body.append(sectionTitle("Calendrier des séances"));
            body.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">");
            for (String line : seanceLines) {
                body.append("<tr><td style=\"padding:10px 14px;margin-bottom:8px;border-left:3px solid ").append(accentColor)
                        .append(";background:#f0f6ff;font-family:").append(FONT)
                        .append(";font-size:14px;color:").append(TEXT_COLOR).append(";\">📅&nbsp;").append(esc(line))
                        .append("</td></tr><tr><td style=\"height:8px;line-height:8px;font-size:8px;\">&nbsp;</td></tr>");
            }
            body.append("</table>");
        }

        // Encart de note
        if (note != null && !note.isBlank()) {
            body.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:18px 0 0;\"><tr>")
                    .append("<td style=\"border-left:4px solid ").append(accentColor)
                    .append(";background:#fff8e1;padding:14px 18px;font-family:").append(FONT)
                    .append(";font-size:14px;line-height:1.6;color:#5d4037;\">").append(note).append("</td></tr></table>");
        }

        return wrap(body.toString());
    }

    private String sectionTitle(String label) {
        return "<p style=\"margin:24px 0 12px;font-family:" + FONT + ";font-size:13px;font-weight:bold;"
                + "text-transform:uppercase;letter-spacing:0.5px;color:" + accentColor
                + ";border-bottom:2px solid " + accentColor + ";padding-bottom:6px;\">" + esc(label) + "</p>";
    }

    private String wrap(String content) {
        String iconHtml = icon.isBlank() ? ""
                : "<div style=\"font-size:42px;line-height:1;margin-bottom:10px;\">" + icon + "</div>";
        return "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head>"
                + "<body style=\"margin:0;padding:0;background:#f4f6f8;\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#f4f6f8;\"><tr>"
                + "<td align=\"center\" style=\"padding:24px 12px;\">"
                + "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" "
                + "style=\"width:600px;max-width:600px;background:#ffffff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;\">"
                // En-tête (couleur unie — compatible Outlook)
                + "<tr><td align=\"center\" style=\"background:" + accentColor + ";padding:32px 30px;\">"
                + iconHtml
                + "<div style=\"font-family:" + FONT + ";font-size:24px;font-weight:bold;color:#ffffff;\">" + esc(title) + "</div>"
                + "</td></tr>"
                // Corps
                + "<tr><td style=\"padding:32px 30px;\">" + content + "</td></tr>"
                // Pied
                + "<tr><td style=\"background:#f8f9fa;border-top:1px solid #e0e0e0;padding:18px 30px;text-align:center;\">"
                + "<p style=\"margin:0 0 4px;font-family:" + FONT + ";font-size:12px;color:" + MUTED + ";\">"
                + "Ceci est un e-mail automatique généré par le système D2F — merci de ne pas y répondre.</p>"
                + "<p style=\"margin:0 0 4px;font-family:" + FONT + ";font-size:12px;color:" + accentColor + ";font-weight:bold;\">"
                + "Esprit — Direction du Développement et de la Formation</p>"
                + "<p style=\"margin:0;font-family:" + FONT + ";font-size:11px;color:" + MUTED + ";\">© 2026 — Tous droits réservés</p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }

    /** Échappe les caractères HTML des valeurs dynamiques (titres, noms, salles…). */
    private static String esc(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
