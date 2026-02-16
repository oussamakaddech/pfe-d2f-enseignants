package esprit.pfe.auth.Services;

import org.springframework.mail.SimpleMailMessage;

public interface EmailService {
    void send(SimpleMailMessage mail);
}
