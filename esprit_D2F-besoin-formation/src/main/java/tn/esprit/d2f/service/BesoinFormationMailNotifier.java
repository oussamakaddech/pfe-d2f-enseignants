package tn.esprit.d2f.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.entity.BesoinFormation;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

/**
 * DSI §: notification e-mail du D2F — le D2F reçoit un e-mail lorsqu'un besoin
 * de formation est ajouté ou modifié par le CUP ou par le chef de département.
 *
 * <p>CANAL D'ENVOI (parité service formation) : dès que {@code azure.ad.enabled=true},
 * l'envoi passe par Microsoft Graph API ({@link BesoinGraphMailSender}) depuis la
 * boîte {@code Application.Formationdesformateurs@Esprit.tn} — le mécanisme déjà
 * opérationnel pour le service formation. Le SMTP classique (JavaMailSender) sert
 * uniquement de repli quand Azure AD n'est pas configuré.</p>
 *
 * <p>Même schéma que le service formation ({@code CalendarMailSender}) :
 * envoi asynchrone sur un executor dédié ({@code besoinMailExecutor}) et
 * journalisation sans aucune donnée personnelle (PII) — seuls l'identifiant
 * du besoin, le rôle et l'action apparaissent dans les traces.</p>
 *
 * <p>Best-effort : un échec d'envoi ne doit JAMAIS faire échouer la transaction
 * métier (aucune exception propagée, simple log d'avertissement).</p>
 */
@Slf4j
@Service
public class BesoinFormationMailNotifier {

    private static final String D2F_ROLE_LABEL = "D2F";

    private final JavaMailSender mailSender;
    private final ObjectProvider<BesoinGraphMailSender> graphSender;
    private final String recipient;
    private final String from;
    private final String host;

    public BesoinFormationMailNotifier(
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            JavaMailSender mailSender,
            ObjectProvider<BesoinGraphMailSender> graphSender,
            @Value("${d2f.besoin.notification.email:${D2F_NOTIFICATION_EMAIL:application.formationdesformateurs@esprit.tn}}") String recipient,
            @Value("${d2f.besoin.notification.from:${MAIL_FROM:application.formationdesformateurs@esprit.tn}}") String from,
            @Value("${spring.mail.host:}") String host) {
        this.mailSender = mailSender;
        this.graphSender = graphSender;
        this.recipient = recipient;
        this.from = from;
        this.host = host;
        if (graphSender.getIfAvailable() != null) {
            log.info("Notifications e-mail D2F actives via Microsoft Graph (parité service formation).");
        } else if (mailSender == null || host == null || host.isBlank()) {
            log.info("Host SMTP non configuré : les notifications e-mail D2F sont désactivées.");
        } else {
            log.info("Notifications e-mail D2F actives via SMTP (envoi asynchrone, executor besoinMailExecutor).");
        }
    }

    /**
     * Notifie le D2F qu'un besoin de formation a été {} par le CUP ou le chef
     * de département (action ∈ {ajouté, modifié}). Asynchrone (executor dédié,
     * parité {@code calendarMailExecutor} du service formation) afin de ne
     * jamais ralentir la requête métier par une latence d'envoi.
     */
    @Async("besoinMailExecutor")
    public void notifyD2FBesoinChanged(BesoinFormation b, String actorRole, String action, String actor) {
        Objects.requireNonNull(b, "besoin");
        if (recipient == null || recipient.isBlank()) {
            log.info("Notification D2F ignorée (destinataire non configuré) : besoin {} {} par {} ({})",
                    b.getIdBesoinFormation(), action, actor, actorRole);
            return;
        }
        String subject = "[D2F] Besoin de formation " + action + " (n°"
                + b.getIdBesoinFormation() + ")";
        String htmlBody = buildHtmlBody(b, actorRole, action, actor);
        BesoinGraphMailSender graph = graphSender.getIfAvailable();
        if (graph != null) {
            try {
                graph.sendMail(recipient, subject, htmlBody);
                log.info("E-mail D2F envoyé via Microsoft Graph : besoin {} {} par {} ({})",
                        b.getIdBesoinFormation(), action, actor, actorRole);
                return;
            } catch (Exception e) {
                log.warn("Échec envoi Graph pour besoin {} ({}), repli SMTP : {}",
                        b.getIdBesoinFormation(), action, e.getMessage());
            }
        }
        sendViaSmtp(b, actorRole, action, actor, subject, htmlBody);
    }

    /** Repli SMTP classique (JavaMailSender) — utilisé seulement sans Azure AD. */
    private void sendViaSmtp(BesoinFormation b, String actorRole, String action, String actor,
                             String subject, String htmlBody) {
        if (mailSender == null || host == null || host.isBlank()) {
            log.info("Notification D2F ignorée (mail désactivé) : besoin {} {} par {} ({})",
                    b.getIdBesoinFormation(), action, actor, actorRole);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            if (from != null && !from.isBlank()) {
                helper.setFrom(from);
            }
            helper.setTo(recipient);
            helper.setSubject(subject);
            // Texte brut (repli) + version HTML : les clients modernes affichent le HTML.
            helper.setText(buildPlainTextBody(b, actorRole, action, actor), htmlBody);
            mailSender.send(message);
            log.info("E-mail D2F envoyé via SMTP : besoin {} {} par {} ({})",
                    b.getIdBesoinFormation(), action, actor, actorRole);
        } catch (Exception e) {
            // Best-effort : jamais bloquant pour la transaction métier.
            log.warn("Échec de l'envoi de l'e-mail D2F pour besoin {} : {}",
                    b.getIdBesoinFormation(), e.getMessage());
        }
    }

    /** Libellé du rôle à l'origine de l'action (CUP, Chef de département, D2F). */
    private String roleLabel(String actorRole) {
        if ("CUP".equalsIgnoreCase(actorRole)) {
            return "CUP";
        }
        if ("CHEF_DEPARTEMENT".equalsIgnoreCase(actorRole)) {
            return "Chef de département";
        }
        return D2F_ROLE_LABEL;
    }

    /** Corps texte brut (repli des clients n'affichant pas le HTML). */
    private String buildPlainTextBody(BesoinFormation b, String actorRole, String action, String actor) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bonjour,\n\n");
        sb.append("Un besoin de formation a été ").append(action).append(" par ")
          .append(roleLabel(actorRole)).append(" (").append(nullSafe(actor)).append(").\n\n");
        sb.append("Détails du besoin :\n");
        sb.append("- Numéro : ").append(b.getIdBesoinFormation()).append('\n');
        sb.append("- Titre : ").append(nullSafe(b.getTitre())).append('\n');
        sb.append("- Thème : ").append(nullSafe(b.getTheme())).append('\n');
        sb.append("- Type : ").append(enumName(b.getTypeBesoin())).append('\n');
        sb.append("- Priorité : ").append(enumName(b.getPriorite())).append('\n');
        sb.append("- UP : ").append(nullSafe(b.getUp())).append('\n');
        sb.append("- Département : ").append(nullSafe(b.getDepartement())).append('\n');
        sb.append("- Statut workflow : ").append(enumName(b.getStatus())).append('\n');
        sb.append("- Étape courante : ").append(enumName(b.getCurrentApprovalStep())).append('\n');
        sb.append("\nCet e-mail est généré automatiquement par la plateforme D2F.\n");
        return sb.toString();
    }

    /**
     * Corps HTML du message : bandeau d'en-tête aux couleurs D2F, phrase
     * d'introduction, puis tableau des caractéristiques du besoin — lisible
     * aussi bien dans Outlook que sur un client mobile.
     */
    private String buildHtmlBody(BesoinFormation b, String actorRole, String action, String actor) {
        String label = roleLabel(actorRole);
        StringBuilder sb = new StringBuilder(4096);
        sb.append("<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>")
          .append("<meta name='viewport' content='width=device-width,initial-scale=1'></head>")
          .append("<body style='margin:0;padding:24px;background:#f4f6f9;")
          .append("font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;'>")
          .append("<table role='presentation' cellpadding='0' cellspacing='0' width='100%' ")
          .append("style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;")
          .append("border-radius:12px;overflow:hidden;'>");

        sb.append("<tr><td style='background:#1F4E79;padding:20px 24px;'>")
          .append("<div style='color:#ffffff;font-size:17px;font-weight:700;'>")
          .append("Plateforme D2F — Direction de la Formation</div>")
          .append("<div style='color:#BDD7EE;font-size:13px;margin-top:4px;'>Besoin de formation ")
          .append(html(action)).append("</div></td></tr>");

        sb.append("<tr><td style='padding:24px 24px 8px;'>")
          .append("<p style='margin:0 0 12px;font-size:14px;'>Bonjour,</p>")
          .append("<p style='margin:0;font-size:14px;line-height:1.6;'>Un besoin de formation a été <strong>")
          .append(html(action)).append("</strong> par <strong>").append(html(label))
          .append("</strong> (").append(html(nullSafe(actor))).append(").</p></td></tr>");

        sb.append("<tr><td style='padding:16px 24px 24px;'>")
          .append("<table role='presentation' cellpadding='0' cellspacing='0' width='100%' ")
          .append("style='border-collapse:collapse;font-size:13.5px;'>");
        appendDetailRow(sb, "Numéro", String.valueOf(b.getIdBesoinFormation()), true);
        appendDetailRow(sb, "Titre", b.getTitre(), false);
        appendDetailRow(sb, "Thème", b.getTheme(), true);
        appendDetailRow(sb, "Type", enumName(b.getTypeBesoin()), false);
        appendDetailRow(sb, "Priorité", enumName(b.getPriorite()), true);
        appendDetailRow(sb, "UP", b.getUp(), false);
        appendDetailRow(sb, "Département", b.getDepartement(), true);
        appendDetailRow(sb, "Statut workflow", enumName(b.getStatus()), false);
        appendDetailRow(sb, "Étape courante", enumName(b.getCurrentApprovalStep()), true);
        sb.append("</table></td></tr>");

        sb.append("<tr><td style='padding:16px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;")
          .append("font-size:12px;color:#6b7280;'>E-mail généré automatiquement par la plateforme D2F. ")
          .append("Merci de ne pas répondre directement à ce message.</td></tr>")
          .append("</table></body></html>");
        return sb.toString();
    }

    /** Ligne du tableau récapitulatif (libellé + valeur, fonds alternés). */
    private void appendDetailRow(StringBuilder sb, String label, String value, boolean alt) {
        String background = alt ? "#f8fafc" : "#ffffff";
        sb.append("<tr><td style='padding:9px 12px;border:1px solid #e5e7eb;background:")
          .append(background).append(";color:#4b5563;font-weight:600;width:42%;'>")
          .append(html(label)).append("</td>")
          .append("<td style='padding:9px 12px;border:1px solid #e5e7eb;background:")
          .append(background).append(";color:#111827;'>")
          .append(html(nullSafe(value))).append("</td></tr>");
    }

    /** Nom d'énumération lisible, ou « - » si absent. */
    private String enumName(Enum<?> value) {
        return value == null ? "-" : value.name();
    }

    /** Échappement HTML minimal (anti-injection dans le corps du message). */
    private String html(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String nullSafe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
