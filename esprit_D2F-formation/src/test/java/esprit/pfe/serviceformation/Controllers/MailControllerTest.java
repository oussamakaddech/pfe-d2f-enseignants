package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

class MailControllerTest {

    private OutlookMailService mailService;
    private MailController controller;

    @BeforeEach
    void setUp() {
        mailService = mock(OutlookMailService.class);
        controller = new MailController(mailService);
    }

    private Map<String, String> payload(String to, String subject, String content) {
        Map<String, String> p = new HashMap<>();
        if (to != null) p.put("to", to);
        if (subject != null) p.put("subject", subject);
        if (content != null) p.put("content", content);
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
        ResponseEntity<Object> r = controller.sendEmail(payload("a@b.tn", null, "c"));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }

    @Test
    void rejectsMissingContent() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@b.tn", "s", null));
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
    }

    @Test
    void sendsValidEmail() {
        ResponseEntity<Object> r = controller.sendEmail(payload("a@b.tn", "s", "c"));
        assertEquals(HttpStatus.OK, r.getStatusCode());
    }

    @Test
    void returnsServerErrorOnRuntimeException() {
        doThrow(new RuntimeException("boom")).when(mailService).sendMail("a@b.tn", "s", "c");
        ResponseEntity<Object> r = controller.sendEmail(payload("a@b.tn", "s", "c"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, r.getStatusCode());
        assertTrue(((Map<?, ?>) r.getBody()).containsKey("error"));
    }
}
