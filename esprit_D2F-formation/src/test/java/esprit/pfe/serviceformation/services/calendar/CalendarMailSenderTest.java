package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.entities.EmailAuditLog;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.repositories.EmailAuditLogRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class CalendarMailSenderTest {

    @Mock private JavaMailSender mailSender;
    @Mock private EmailAuditLogRepository auditRepository;
    @Mock private CalendarProperties properties;
    @Mock private CalendarProperties.MailSettings mailProperties;

    @InjectMocks private CalendarMailSender sender;

    @Test
    void sendInvitationSendsEmailAndLogsAudit() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(properties.getMail()).thenReturn(mailProperties);
        when(mailProperties.getFrom()).thenReturn("test@esprit.tn");

        byte[] icsContent = "BEGIN:VCALENDAR".getBytes(StandardCharsets.UTF_8);

        sender.sendInvitation(1L, "test@esprit.tn", icsContent, "Subject", "Body");

        verify(mailSender).send(any(MimeMessage.class));
        verify(auditRepository).save(any(EmailAuditLog.class));
    }

    @Test
    void sendInvitationLogsFailureOnException() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(properties.getMail()).thenReturn(mailProperties);
        when(mailProperties.getFrom()).thenReturn("test@esprit.tn");
        doThrow(new RuntimeException("SMTP down")).when(mailSender).send(any(MimeMessage.class));

        byte[] icsContent = "BEGIN:VCALENDAR".getBytes(StandardCharsets.UTF_8);

        sender.sendInvitation(1L, "test@esprit.tn", icsContent, "Subject", "Body");

        verify(mailSender).send(any(MimeMessage.class));
        verify(auditRepository).save(any(EmailAuditLog.class));
    }

    @Test
    void sendInvitationUsesMicrosoftGraphWhenAvailable() {
        OutlookMailService graph = mock(OutlookMailService.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<OutlookMailService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(graph);
        CalendarMailSender graphSender = new CalendarMailSender(mailSender, auditRepository, properties, provider);
        byte[] icsContent = "BEGIN:VCALENDAR".getBytes(StandardCharsets.UTF_8);

        graphSender.sendInvitation(1L, "test@esprit.tn", icsContent, "Subject", "Body");

        verify(graph).sendMailWithAttachment(eq("test@esprit.tn"), eq("Subject"), eq("Body"), eq(false),
                eq("invitation.ics"), startsWith("text/calendar"), eq(icsContent));
        verify(mailSender, never()).send(any(MimeMessage.class));
        ArgumentCaptor<EmailAuditLog> audit = ArgumentCaptor.forClass(EmailAuditLog.class);
        verify(auditRepository).save(audit.capture());
        assertThat(audit.getValue().isSuccess()).isTrue();
    }
}
