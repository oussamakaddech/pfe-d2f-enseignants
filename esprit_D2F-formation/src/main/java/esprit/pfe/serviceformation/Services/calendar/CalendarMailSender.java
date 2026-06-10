package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.config.AsyncConfig;
import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.config.PiiSafeLogger;
import esprit.pfe.serviceformation.entities.EmailAuditLog;
import esprit.pfe.serviceformation.repositories.EmailAuditLogRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Envoi asynchrone d'un e-mail d'invitation avec pièce jointe .ics, et
 * journalisation auditée de chaque tentative.
 * <p>
 * Méthode {@code @Async} isolée dans son propre composant pour bénéficier du
 * proxy Spring (l'auto-invocation depuis le même bean ne serait pas asynchrone).
 * Sécurité : aucune adresse e-mail ni contenu privé n'est écrit dans les logs
 * (PII confinée à la table d'audit dédiée).
 */
@Component
@RequiredArgsConstructor
public class CalendarMailSender {

    public static final String EMAIL_TYPE = "INVITATION_CALENDRIER";
    private static final String ICS_CONTENT_TYPE = "text/calendar; charset=UTF-8; method=REQUEST";
    private static final String ICS_FILENAME = "invitation.ics";

    private static final Logger log = PiiSafeLogger.getLogger(CalendarMailSender.class);

    private final JavaMailSender mailSender;
    private final EmailAuditLogRepository auditRepository;
    private final CalendarProperties properties;

    @Async(AsyncConfig.CALENDAR_MAIL_EXECUTOR)
    public void sendInvitation(Long formationId, String recipient, byte[] icsContent,
                               String subject, String body) {
        boolean success = false;
        String error = null;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(properties.getMail().getFrom());
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(body, false);
            helper.addAttachment(ICS_FILENAME,
                    new ByteArrayResource(icsContent), ICS_CONTENT_TYPE);
            mailSender.send(message);
            success = true;
        } catch (Exception e) {
            error = e.getClass().getSimpleName();
            log.warn("Échec d'envoi d'invitation calendrier pour la formation {} : {}", formationId, error);
        } finally {
            persistAudit(formationId, recipient, success, error);
        }
    }

    private void persistAudit(Long formationId, String recipient, boolean success, String error) {
        try {
            auditRepository.save(new EmailAuditLog(formationId, recipient, EMAIL_TYPE, success, error));
        } catch (Exception persistError) {
            log.error("Journalisation d'audit e-mail impossible pour la formation {}", formationId);
        }
    }
}
