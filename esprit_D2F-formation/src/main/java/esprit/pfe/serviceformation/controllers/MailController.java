package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.microsoft.MailSendPolicy;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.services.CurrentUser;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/mail")
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
public class MailController {
    private static final String ERROR_KEY = "error";
    private final OutlookMailService mailService;
    private final MailSendPolicy sendPolicy;

    /**
     * Envoie un e-mail via Microsoft Graph API.
     * Accepte le contenu dans le body (JSON) pour éviter les problèmes
     * d'encodage des caractères spéciaux (accents, sauts de ligne) dans les query params.
     * Réservé à FORMATION_CREATE = ADMIN, CUP, CHEF_DEPARTEMENT.
     */
    @PostMapping("/send")
    @PreAuthorize(AuthorizationMatrix.FORMATION_CREATE)
    public ResponseEntity<Object> sendEmail(@RequestBody Map<String, String> payload) {
        String to = payload.get("to");
        String subject = payload.get("subject");
        String content = payload.get("content");
        // Frontend peut demander explicitement le rendu HTML (ex: gabarits BesoinMailCupModal).
        // Défaut : texte brut — préserve le rendu correct dans Outlook pour les emails
        // ad-hoc saisis dans MailForm/DemandesList.
        boolean isHtml = "true".equalsIgnoreCase(payload.get("isHtml"));

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
            String recipient = sendPolicy.checkRecipient(to);
            String sender = currentSender();
            sendPolicy.consumeQuota(sender);
            log.info("[AUDIT] Envoi d'e-mail par {} vers {} (sujet : {})", sender, recipient, subject);
            mailService.sendMail(recipient, subject, content, isHtml);
            return ResponseEntity.ok(Map.of("message", "E-mail envoyé à " + recipient));
        } catch (MailSendPolicy.QuotaExceededException e) {
            log.warn("[AUDIT] Quota d'envoi atteint pour {}", currentSender());
            return ResponseEntity.status(429).body(Map.of(ERROR_KEY, e.getMessage()));
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

    /** Identité de l'expéditeur (JWT), pour le quota et la trace d'audit. */
    private static String currentSender() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return CurrentUser.fromJwt(jwt).emailOrUsername();
        }
        return auth != null && auth.getName() != null ? auth.getName() : "inconnu";
    }
}


