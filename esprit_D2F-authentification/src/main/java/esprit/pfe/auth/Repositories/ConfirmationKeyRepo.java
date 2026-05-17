package esprit.pfe.auth.repositories;

import esprit.pfe.auth.entities.ConfirmationKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ConfirmationKeyRepo extends JpaRepository<ConfirmationKey, Long> {

    boolean existsByEmailAddress(String emailAddress);

    boolean existsByToken(String token);

    Optional<ConfirmationKey> findByToken(String token);

    @Modifying
    @Query("DELETE FROM ConfirmationKey k WHERE k.expiresAt < :now")
    int deleteAllExpiredBefore(@Param("now") LocalDateTime now);
}
