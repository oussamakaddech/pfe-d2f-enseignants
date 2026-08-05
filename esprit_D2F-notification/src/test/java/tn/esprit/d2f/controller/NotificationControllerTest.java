package tn.esprit.d2f.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import tn.esprit.d2f.dto.NotificationCountResponse;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.dto.NotificationResponse;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;
import tn.esprit.d2f.service.INotificationService;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationController - Tests unitaires")
class NotificationControllerTest {

    @Mock
    private INotificationService notificationService;

    private NotificationController controller;
    private NotificationResponse notification;

    @BeforeEach
    void setUp() {
        controller = new NotificationController(notificationService);
        notification = new NotificationResponse(
                "1",
                NotificationType.FORMATION,
                NotificationSeverity.INFO,
                "Title",
                "Message",
                false,
                "user@example.com",
                "/link",
                "actor",
                null,
                null
        );
    }

    private Authentication jwtAuth(String email, String username, String subject) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject(subject)
                .claim("email", email)
                .claim("preferred_username", username)
                .build();
        return new UsernamePasswordAuthenticationToken(jwt, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    @DisplayName("list() - doit déléguer au service avec le bon destinataire")
    void list_shouldDelegateToService() {
        Authentication auth = jwtAuth("user@example.com", "user", "subject-1");
        Page<NotificationResponse> page = new PageImpl<>(List.of(notification));
        when(notificationService.listForRecipient(eq("user@example.com"), anyBoolean(), any(Pageable.class)))
                .thenReturn(page);

        ResponseEntity<Page<NotificationResponse>> response = controller.list(auth, false, 0, 10);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).hasSize(1);
        verify(notificationService, times(1)).listForRecipient(eq("user@example.com"), eq(false), any(Pageable.class));
    }

    @Test
    @DisplayName("list() - doit respecter le flag unreadOnly")
    void list_shouldHandleUnreadOnly() {
        Authentication auth = jwtAuth("user@example.com", "user", "subject-1");
        Page<NotificationResponse> page = new PageImpl<>(List.of());
        when(notificationService.listForRecipient(any(), anyBoolean(), any(Pageable.class))).thenReturn(page);

        controller.list(auth, true, 0, 20);

        verify(notificationService, times(1)).listForRecipient(eq("user@example.com"), eq(true), any(Pageable.class));
    }

    @Test
    @DisplayName("count() - doit compter les notifications du destinataire")
    void count_shouldCount() {
        Authentication auth = jwtAuth("user@example.com", "user", "subject-1");
        NotificationCountResponse counts = new NotificationCountResponse(5L, 2L);
        when(notificationService.countForRecipient("user@example.com")).thenReturn(counts);

        ResponseEntity<NotificationCountResponse> response = controller.count(auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().total()).isEqualTo(5L);
        assertThat(response.getBody().unread()).isEqualTo(2L);
    }

    @Test
    @DisplayName("markAsRead() - doit marquer la notification comme lue")
    void markAsRead_shouldMarkAsRead() {
        Authentication auth = jwtAuth("user@example.com", "user", "subject-1");
        when(notificationService.markAsRead(1L, "user@example.com")).thenReturn(notification);

        ResponseEntity<NotificationResponse> response = controller.markAsRead(auth, 1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(notificationService, times(1)).markAsRead(1L, "user@example.com");
    }

    @Test
    @DisplayName("markAllAsRead() - doit retourner 204")
    void markAllAsRead_shouldReturnNoContent() {
        Authentication auth = jwtAuth("user@example.com", "user", "subject-1");
        when(notificationService.markAllAsRead("user@example.com")).thenReturn(3L);

        ResponseEntity<Void> response = controller.markAllAsRead(auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(notificationService, times(1)).markAllAsRead("user@example.com");
    }

    @Test
    @DisplayName("delete() - doit supprimer une notification")
    void delete_shouldDelete() {
        Authentication auth = jwtAuth("user@example.com", "user", "subject-1");

        ResponseEntity<Void> response = controller.delete(auth, 1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(notificationService, times(1)).delete(1L, "user@example.com");
    }

    @Test
    @DisplayName("deleteAll() - doit tout supprimer")
    void deleteAll_shouldDeleteAll() {
        Authentication auth = jwtAuth("user@example.com", "user", "subject-1");

        ResponseEntity<Void> response = controller.deleteAll(auth);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(notificationService, times(1)).deleteAll("user@example.com");
    }

    @Test
    @DisplayName("create() - admin doit pouvoir créer une notification")
    void create_shouldCreateNotification() {
        NotificationRequest request = new NotificationRequest(
                "admin-target",
                NotificationType.SYSTEM,
                NotificationSeverity.INFO,
                "Title",
                "Message",
                "/link",
                "admin",
                Map.of()
        );
        when(notificationService.create(request)).thenReturn(notification);

        ResponseEntity<NotificationResponse> response = controller.create(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        verify(notificationService, times(1)).create(request);
    }

    @Test
    @DisplayName("currentRecipient() - doit utiliser l'email du JWT en priorité")
    void currentRecipient_shouldUseEmailFromJwt() {
        Authentication auth = jwtAuth("user@example.com", "user-fallback", "subject-1");
        NotificationCountResponse counts = new NotificationCountResponse(0L, 0L);
        when(notificationService.countForRecipient("user@example.com")).thenReturn(counts);

        controller.count(auth);

        verify(notificationService, times(1)).countForRecipient("user@example.com");
    }

    @Test
    @DisplayName("currentRecipient() - doit fallback sur preferred_username si email absent")
    void currentRecipient_shouldFallbackToUsername() {
        Authentication auth = jwtAuth(null, "user-fallback", "subject-1");
        NotificationCountResponse counts = new NotificationCountResponse(0L, 0L);
        when(notificationService.countForRecipient("user-fallback")).thenReturn(counts);

        controller.count(auth);

        verify(notificationService, times(1)).countForRecipient("user-fallback");
    }

    @Test
    @DisplayName("currentRecipient() - doit fallback sur subject si email et username absents")
    void currentRecipient_shouldFallbackToSubject() {
        Authentication auth = jwtAuth(null, null, "subject-1");
        NotificationCountResponse counts = new NotificationCountResponse(0L, 0L);
        when(notificationService.countForRecipient("subject-1")).thenReturn(counts);

        controller.count(auth);

        verify(notificationService, times(1)).countForRecipient("subject-1");
    }

    @Test
    @DisplayName("currentRecipient() - doit retourner 'anonymous' si pas d'auth")
    void currentRecipient_shouldReturnAnonymousIfNoAuth() {
        NotificationCountResponse counts = new NotificationCountResponse(0L, 0L);
        when(notificationService.countForRecipient("anonymous")).thenReturn(counts);

        controller.count(null);

        verify(notificationService, times(1)).countForRecipient("anonymous");
    }

    @Test
    @DisplayName("currentRecipient() - doit utiliser auth.getName() si principal n'est pas un Jwt")
    void currentRecipient_shouldUseAuthNameForNonJwt() {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                "simpleUser", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        NotificationCountResponse counts = new NotificationCountResponse(0L, 0L);
        when(notificationService.countForRecipient("simpleUser")).thenReturn(counts);

        controller.count(auth);

        verify(notificationService, times(1)).countForRecipient("simpleUser");
    }
}
