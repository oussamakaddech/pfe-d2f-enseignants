package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/mail")
@RequiredArgsConstructor
@Slf4j
public class MailController {
    private static final String ERROR_KEY = "error";
    private final OutlookMailService mailService;

    /**
     * Envoie un e-mail via Microsoft Graph API.
     * Accepte le contenu dans le body (JSON) pour éviter les problèmes
     * d'encodage des caractères spéciaux (accents, sauts de ligne) dans les query params.
     */
    @PostMapping("/send")
    public ResponseEntity<Object> sendEmail(@RequestBody Map<String, String> payload) {
        String to = payload.get("to");
        String subject = payload.get("subject");
        String content = payload.get("content");

        if (to == null || to.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(ERROR_KEY, "Le destinataire (to) est obligatoire"));
        }
        if (subject == null || subject.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(ERROR_KEY, "Le sujet (subject) est obligatoire"));
        }
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(ERROR_KEY, "Le contenu (content) est obligatoire"));
        }

        try {
            mailService.sendMail(to, subject, content);
            return ResponseEntity.ok(Map.of("message", "E-mail envoyé à " + to));
        } catch (IllegalArgumentException e) {
            log.warn("Paramètre invalide pour l'envoi d'email : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(ERROR_KEY, e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Erreur lors de l'envoi de l'e-mail : {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of(ERROR_KEY, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur inattendue lors de l'envoi de l'e-mail : {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of(ERROR_KEY, "Erreur inattendue : " + e.getMessage()));
        }
    }
}


