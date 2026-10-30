package esprit.pfe.auth.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceImplTest {

    @Mock
    private JavaMailSender javaMailSender;

    @Mock
    private ObjectProvider<AuthGraphMailSender> graphSenders;

    @Mock
    private AuthGraphMailSender graphMailSender;

    @InjectMocks
    private EmailServiceImpl emailService;

    @Test
    void testSendEmail() {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo("test@test.com");

        emailService.send(message);

        verify(javaMailSender).send(message);
    }

    @Test
    void testSendPrefersGraphWhenAvailable() {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo("user@esprit.tn");
        message.setSubject("Password reset");
        message.setText("token");
        when(graphSenders.getIfAvailable()).thenReturn(graphMailSender);

        emailService.send(message);

        verify(graphMailSender).sendMail("user@esprit.tn", "Password reset", "token");
        verify(javaMailSender, never()).send(message);
    }
}
