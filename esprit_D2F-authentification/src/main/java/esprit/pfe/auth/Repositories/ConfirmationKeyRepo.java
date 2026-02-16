package esprit.pfe.auth.Repositories;



import esprit.pfe.auth.Entities.ConfirmationKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfirmationKeyRepo extends JpaRepository<ConfirmationKey, Long> {

    boolean existsByEmailAddress(String emailAddress);

    boolean existsByConfirmationKey(String confirmationKey);

    Optional<ConfirmationKey> findByConfirmationKey(String confirmationKey);
}
