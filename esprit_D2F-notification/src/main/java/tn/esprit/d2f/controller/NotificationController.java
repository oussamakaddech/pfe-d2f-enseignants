package tn.esprit.d2f.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.esprit.d2f.dto.NotificationCountResponse;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.dto.NotificationResponse;
import tn.esprit.d2f.service.INotificationService;

/**
 * Contrôleur REST du centre de notifications.
 *
 * <p>Le destinataire est toujours le JWT authentifié (RBAC deny-by-default) ;
 * seul l'endpoint admin de création accepte un destinataire explicite.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final INotificationService notificationService;

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> list(
            Authentication auth,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(
                notificationService.listForRecipient(currentRecipient(auth), unreadOnly, pageable));
    }

    @GetMapping("/count")
    public ResponseEntity<NotificationCountResponse> count(Authentication auth) {
        return ResponseEntity.ok(notificationService.countForRecipient(currentRecipient(auth)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            Authentication auth, @PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id, currentRecipient(auth)));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication auth) {
        notificationService.markAllAsRead(currentRecipient(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long id) {
        notificationService.delete(id, currentRecipient(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll(Authentication auth) {
        notificationService.deleteAll(currentRecipient(auth));
        return ResponseEntity.noContent().build();
    }

    /**
     * Création explicite (admin / service technique). Le destinataire est fourni
     * dans le corps — c'est aussi le point d'entrée des événements « live »
     * poussés par un script d'amorçage ou un autre service.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationResponse> create(
            @Valid @RequestBody NotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notificationService.create(request));
    }

    private String currentRecipient(Authentication auth) {
        if (auth == null) return "anonymous";
        Object principal = auth.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) return email;
            String username = jwt.getClaimAsString("preferred_username");
            if (username != null && !username.isBlank()) return username;
            return jwt.getSubject();
        }
        return auth.getName();
    }
}
