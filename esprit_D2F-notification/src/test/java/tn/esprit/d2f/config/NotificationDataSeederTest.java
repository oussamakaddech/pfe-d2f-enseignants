package tn.esprit.d2f.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.INotificationService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationDataSeeder - Tests unitaires")
class NotificationDataSeederTest {

    @Mock
    private NotificationRepository repository;

    @Mock
    private INotificationService notificationService;

    private NotificationDataSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder = new NotificationDataSeeder(repository, notificationService);
        ReflectionTestUtils.setField(seeder, "seedRecipients", List.of("admin", "user1"));
        ReflectionTestUtils.setField(seeder, "seedEnabled", true);
    }

    @Test
    @DisplayName("run() - doit être no-op si seedEnabled=false")
    void run_shouldBeNoOpWhenSeedDisabled() {
        ReflectionTestUtils.setField(seeder, "seedEnabled", false);

        seeder.run();

        verify(repository, never()).count();
        verify(notificationService, never()).create(any());
    }

    @Test
    @DisplayName("run() - doit être no-op si la table n'est pas vide")
    void run_shouldBeNoOpWhenTableNotEmpty() {
        when(repository.count()).thenReturn(5L);

        seeder.run();

        verify(repository, times(1)).count();
        verify(notificationService, never()).create(any());
    }

    @Test
    @DisplayName("run() - doit créer 5 notifications par défaut lorsque la table est vide")
    void run_shouldSeedFiveNotificationsWhenTableEmpty() {
        when(repository.count()).thenReturn(0L);

        seeder.run();

        verify(repository, times(1)).count();
        verify(notificationService, times(5)).create(any(NotificationRequest.class));
    }

    @Test
    @DisplayName("run() - doit utiliser le premier destinataire configuré")
    void run_shouldUseFirstRecipient() {
        when(repository.count()).thenReturn(0L);

        seeder.run();

        verify(notificationService, times(5)).create(any(NotificationRequest.class));
    }
}
