package esprit.pfe.auth.scheduling;

import esprit.pfe.auth.repositories.ConfirmationKeyRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpiredTokenPurgeSchedulerTest {

    @Mock
    private ConfirmationKeyRepo confirmationKeyRepo;

    @InjectMocks
    private ExpiredTokenPurgeScheduler scheduler;

    @Test
    void purgeExpiredTokens_shouldCallDeleteAllExpired() {
        when(confirmationKeyRepo.deleteAllExpiredBefore(any(LocalDateTime.class))).thenReturn(3);

        scheduler.purgeExpiredTokens();

        verify(confirmationKeyRepo).deleteAllExpiredBefore(any(LocalDateTime.class));
    }

    @Test
    void purgeExpiredTokens_noExpiredTokens_shouldStillCallDelete() {
        when(confirmationKeyRepo.deleteAllExpiredBefore(any(LocalDateTime.class))).thenReturn(0);

        scheduler.purgeExpiredTokens();

        verify(confirmationKeyRepo).deleteAllExpiredBefore(any(LocalDateTime.class));
    }
}
