package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.microsoft.MailSendPolicy;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MailControllerTest {

    private OutlookMailService mailService;
    private EnseignantRepository enseignantRepository;
    private AnimateurExterneRepository animateurExterneRepository;
    private MailController controller;

    @BeforeEach
    void setUp() {
        mailService = mock(OutlookMailService.class);
        enseignantRepository = mock(EnseignantRepository.class);
        animateurExterneRepository = mock(AnimateurExterneRepository.class);
        when(enseignantRepository.findByMailIgnoreCase(anyString())).thenReturn(Optional.empty());
        controller = new MailController(mailService,
                new MailSendPolicy(enseignantRepository, animateurExterneRepository, "esprit.tn", 3));
    }

    private Map<String, String> payload(String to, String subject, String content) {
        Map<String, String> p = new HashMap<>();
        if (to != null) p.put("to", to);
        if (subject != null) p.put("subject", subject);
        if (content != null) p.put("content", content);
        return p;
    }

    private Map<String, String> payloadWithHtml(String to, String subject, String content, Boolean isHtml) {
        Map<String, String> p = payload(to, subject, content);
        if (isHtml != null) p.put("isHtml", isHtml ? "true" : "false");
        return p;
    }

    @Test
    void rejectsMissingTo() {
        ResponseEntity<Object> r = controller.sendEmail(payload(null, "s", "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    @Test
    void rejectsMissingSubject() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", null, "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    @Test
    void rejectsMissingContent() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", "s", null));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
    }

    @Test
    void sendsValidEmail() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", "s", "c"));
        assertEquals(HttpStatus.OK, r.getStatusCode());
    }

    @Test
    void sendsValidEmailAsHtmlWhenFlagTrue() {
        ResponseEntity<Object> r = controller.sendEmail(payloadWithHtml("a@esprit.tn", "s", "<p>html</p>", true));
        assertEquals(HttpStatus.OK, r.getStatusCode());
    }

    @Test
    void ignoresIsHtmlFlagWhenFalse() {
        ResponseEntity<Object> r = controller.sendEmail(payloadWithHtml("a@esprit.tn", "s", "plain text", false));
        assertEquals(HttpStatus.OK, r.getStatusCode());
    }

    @Test
    void treatsBlankIsHtmlAsPlainText() {
        ResponseEntity<Object> r = controller.sendEmail(payloadWithHtml("a@esprit.tn", "s", "plain text", null));
        assertEquals(HttpStatus.OK, r.getStatusCode());
    }

    @Test
    void returnsServerErrorOnRuntimeException() {
        doThrow(new RuntimeException("boom")).when(mailService).sendMail("a@esprit.tn", "s", "c", false);
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", "s", "c"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    @Test
    void rejectsBlankTo() {
        ResponseEntity<Object> r = controller.sendEmail(payload("   ", "s", "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    @Test
    void rejectsBlankSubject() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", "   ", "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    @Test
    void rejectsBlankContent() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", "s", "   "));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    @Test
    void returnsBadRequestOnIllegalArgumentException() {
        doThrow(new IllegalArgumentException("invalid")).when(mailService).sendMail("a@esprit.tn", "s", "c", false);
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", "s", "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    // ── Garde-fous (audit des rôles du 07/10/2026) ──────────────────────────

    @Test
    void rejectsExternalRecipientUnknownToThePlatform() {
        ResponseEntity<Object> r = controller.sendEmail(payload("victime@gmail.com", "s", "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        verify(mailService, never()).sendMail(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void rejectsSeveralRecipients() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn,b@gmail.com", "s", "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        verify(mailService, never()).sendMail(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void rejectsLookalikeDomain() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn.evil.com", "s", "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
    }

    @Test
    void acceptsInstitutionalSubdomain() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@etudiant.esprit.tn", "s", "c"));
        assertEquals(HttpStatus.OK, r.getStatusCode());
    }

    @Test
    void acceptsExternalAddressKnownAsTeacherOrExternalAnimator() {
        when(enseignantRepository.findByMailIgnoreCase("prof@gmail.com")).thenReturn(Optional.of(new Enseignant()));
        when(animateurExterneRepository.existsByEmailIgnoreCase("anim@cabinet.fr")).thenReturn(true);
        assertEquals(HttpStatus.OK, controller.sendEmail(payload("prof@gmail.com", "s", "c")).getStatusCode());
        assertEquals(HttpStatus.OK, controller.sendEmail(payload("anim@cabinet.fr", "s", "c")).getStatusCode());
    }

    @Test
    void enforcesHourlyQuotaPerSender() {
        for (int i = 0; i < 3; i++) {
            assertEquals(HttpStatus.OK, controller.sendEmail(payload("a@esprit.tn", "s", "c")).getStatusCode());
        }
        ResponseEntity<Object> r = controller.sendEmail(payload("a@esprit.tn", "s", "c"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, r.getStatusCode());
    }
}
