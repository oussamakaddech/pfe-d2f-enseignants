package esprit.pfe.auth.services;

import org.springframework.mail.SimpleMailMessage;

public interface EmailService {
    void send(SimpleMailMessage mail);
}
