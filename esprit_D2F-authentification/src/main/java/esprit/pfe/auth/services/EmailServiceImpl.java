package esprit.pfe.auth.services;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Envoi e-mail du service auth : Microsoft Graph API en priorité
 * ({@link AuthGraphMailSender}, seul canal opérationnel — SMTP basic auth
 * désactivé côté Office 365), repli SMTP classique si Graph n'est pas
 * configuré ({@code azure.ad.enabled=false}).
 */
@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender javaMailSender;
    private final ObjectProvider<AuthGraphMailSender> graphSenders;

    public EmailServiceImpl(JavaMailSender javaMailSender,
                            ObjectProvider<AuthGraphMailSender> graphSenders) {
        this.javaMailSender = javaMailSender;
        this.graphSenders = graphSenders;
    }

    @Override
    public void send(SimpleMailMessage mail) {
        AuthGraphMailSender graph = graphSenders.getIfAvailable();
        if (graph != null) {
            String to = mail.getTo() != null && mail.getTo().length > 0 ? mail.getTo()[0] : null;
            graph.sendMail(to, mail.getSubject(), mail.getText());
            return;
        }
        javaMailSender.send(mail);
    }
}
