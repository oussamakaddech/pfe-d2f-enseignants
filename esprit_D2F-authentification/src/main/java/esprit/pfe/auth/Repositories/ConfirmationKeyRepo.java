package esprit.pfe.auth.repositories;



import esprit.pfe.auth.entities.ConfirmationKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfirmationKeyRepo extends JpaRepository<ConfirmationKey, Long> {

    boolean existsByEmailAddress(String emailAddress);

    boolean existsByToken(String token);

    Optional<ConfirmationKey> findByToken(String token);
}
