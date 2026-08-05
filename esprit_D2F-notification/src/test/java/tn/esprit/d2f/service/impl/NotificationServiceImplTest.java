package tn.esprit.d2f.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.dto.NotificationCountResponse;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.dto.NotificationResponse;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;
import tn.esprit.d2f.mapper.NotificationMapper;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.NotificationWebSocketService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationServiceImpl - Tests unitaires")
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository repository;

    @Mock
    private NotificationMapper mapper;

    @Mock
    private NotificationWebSocketService webSocketService;

    @InjectMocks
    private NotificationServiceImpl service;

    private NotificationRequest request;
    private Notification entity;

    @BeforeEach
    void setUp() {
        request = new NotificationRequest(
                "test-user",
                NotificationType.FORMATION,
                NotificationSeverity.INFO,
                "Test Title",
                "Test Message",
                "/test/link",
                "Test Actor",
                Map.of("key", "value")
        );

        entity = new Notification();
        entity.setIdNotification(1L);
        entity.setRecipient("test-user");
        entity.setType(NotificationType.FORMATION);
        entity.setSeverity(NotificationSeverity.INFO);
        entity.setTitle("Test Title");
        entity.setMessage("Test Message");
        entity.setLink("/test/link");
        entity.setActor("Test Actor");
        entity.setRead(false);
        entity.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("create() - doit créer une notification et la pousser via WebSocket")
    void create_shouldPersistAndPushNotification() {
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(any(Notification.class))).thenReturn(entity);

        NotificationResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.recipient()).isEqualTo("test-user");
        assertThat(response.title()).isEqualTo("Test Title");
        assertThat(response.read()).isFalse();

        verify(mapper, times(1)).toEntity(request);
        verify(repository, times(1)).save(any(Notification.class));
        verify(webSocketService, times(1)).pushToUser(eq("test-user"), any(NotificationResponse.class));
    }

    @Test
    @DisplayName("listForRecipient() - doit retourner les notifications non lues")
    void listForRecipient_unreadOnly_shouldReturnOnlyUnread() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notification> page = new PageImpl<>(List.of(entity));
        when(repository.findByRecipientAndReadOrderByCreatedAtDesc("test-user", false, pageable))
                .thenReturn(page);

        Page<NotificationResponse> result = service.listForRecipient("test-user", true, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(repository, times(1)).findByRecipientAndReadOrderByCreatedAtDesc("test-user", false, pageable);
        verify(repository, never()).findByRecipientOrderByCreatedAtDesc(anyString(), any(Pageable.class));
    }

    @Test
    @DisplayName("listForRecipient() - doit retourner toutes les notifications")
    void listForRecipient_all_shouldReturnAll() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notification> page = new PageImpl<>(List.of(entity));
        when(repository.findByRecipientOrderByCreatedAtDesc("test-user", pageable)).thenReturn(page);

        Page<NotificationResponse> result = service.listForRecipient("test-user", false, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(repository, times(1)).findByRecipientOrderByCreatedAtDesc("test-user", pageable);
        verify(repository, never()).findByRecipientAndReadOrderByCreatedAtDesc(anyString(), eq(false), any(Pageable.class));
    }

    @Test
    @DisplayName("countForRecipient() - doit retourner les compteurs total et non lus")
    void countForRecipient_shouldReturnCounts() {
        when(repository.countByRecipient("test-user")).thenReturn(10L);
        when(repository.countByRecipientAndRead("test-user", false)).thenReturn(3L);

        NotificationCountResponse counts = service.countForRecipient("test-user");

        assertThat(counts).isNotNull();
        assertThat(counts.total()).isEqualTo(10L);
        assertThat(counts.unread()).isEqualTo(3L);
    }

    @Test
    @DisplayName("markAsRead() - doit marquer une notification comme lue")
    void markAsRead_shouldMarkAsReadAndPush() {
        when(repository.findByIdNotificationAndRecipient(1L, "test-user")).thenReturn(Optional.of(entity));
        when(repository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        NotificationResponse response = service.markAsRead(1L, "test-user");

        assertThat(response).isNotNull();
        assertThat(response.read()).isTrue();
        verify(webSocketService, times(1)).pushToUser(eq("test-user"), any(NotificationResponse.class));
    }

    @Test
    @DisplayName("markAsRead() - doit échouer si la notification n'appartient pas au destinataire")
    void markAsRead_shouldThrowIfNotFound() {
        when(repository.findByIdNotificationAndRecipient(99L, "test-user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markAsRead(99L, "test-user"))
                .isInstanceOf(tn.esprit.d2f.exception.ResourceNotFoundException.class)
                .hasMessage("Notification non trouvée");

        verify(repository, never()).save(any(Notification.class));
        verify(webSocketService, never()).pushToUser(anyString(), any(NotificationResponse.class));
    }

    @Test
    @DisplayName("markAllAsRead() - doit marquer toutes les notifications comme lues")
    void markAllAsRead_shouldReturnCount() {
        when(repository.markAllAsReadForRecipient("test-user")).thenReturn(5L);

        long count = service.markAllAsRead("test-user");

        assertThat(count).isEqualTo(5L);
        verify(repository, times(1)).markAllAsReadForRecipient("test-user");
    }

    @Test
    @DisplayName("delete() - doit supprimer une notification existante")
    void delete_shouldDeleteNotification() {
        when(repository.findByIdNotificationAndRecipient(1L, "test-user")).thenReturn(Optional.of(entity));
        doNothing().when(repository).delete(entity);

        service.delete(1L, "test-user");

        verify(repository, times(1)).delete(entity);
    }

    @Test
    @DisplayName("delete() - doit échouer si la notification n'existe pas")
    void delete_shouldThrowIfNotFound() {
        when(repository.findByIdNotificationAndRecipient(99L, "test-user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99L, "test-user"))
                .isInstanceOf(tn.esprit.d2f.exception.ResourceNotFoundException.class)
                .hasMessage("Notification non trouvée");

        verify(repository, never()).delete(any(Notification.class));
    }

    @Test
    @DisplayName("deleteAll() - doit supprimer toutes les notifications du destinataire")
    void deleteAll_shouldDeleteAllForRecipient() {
        doNothing().when(repository).deleteByRecipient("test-user");

        service.deleteAll("test-user");

        verify(repository, times(1)).deleteByRecipient("test-user");
    }

    @Test
    @DisplayName("findById() - doit retourner une notification si elle existe")
    void findById_shouldReturnNotification() {
        when(repository.findByIdNotificationAndRecipient(1L, "test-user")).thenReturn(Optional.of(entity));

        Optional<NotificationResponse> result = service.findById(1L, "test-user");

        assertThat(result).isPresent();
        assertThat(result.get().recipient()).isEqualTo("test-user");
    }

    @Test
    @DisplayName("findById() - doit retourner Optional.empty si non trouvée")
    void findById_shouldReturnEmptyIfNotFound() {
        when(repository.findByIdNotificationAndRecipient(99L, "test-user")).thenReturn(Optional.empty());

        Optional<NotificationResponse> result = service.findById(99L, "test-user");

        assertThat(result).isEmpty();
    }
}
