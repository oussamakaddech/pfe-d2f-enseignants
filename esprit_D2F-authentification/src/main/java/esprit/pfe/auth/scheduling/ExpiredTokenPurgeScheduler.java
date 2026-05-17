package esprit.pfe.auth.scheduling;

import esprit.pfe.auth.repositories.ConfirmationKeyRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Purge les tokens de réinitialisation expirés toutes les heures.
 */
@Component
@Slf4j
public class ExpiredTokenPurgeScheduler {

    private final ConfirmationKeyRepo confirmationKeyRepo;

    public ExpiredTokenPurgeScheduler(ConfirmationKeyRepo confirmationKeyRepo) {
        this.confirmationKeyRepo = confirmationKeyRepo;
    }

    @Scheduled(fixedRate = 3_600_000) // toutes les heures (en ms)
    @Transactional
    public void purgeExpiredTokens() {
        int deleted = confirmationKeyRepo.deleteAllExpiredBefore(LocalDateTime.now());
        if (deleted > 0) {
            log.info("Purge des tokens expirés : {} token(s) supprimé(s)", deleted);
        }
    }
}
