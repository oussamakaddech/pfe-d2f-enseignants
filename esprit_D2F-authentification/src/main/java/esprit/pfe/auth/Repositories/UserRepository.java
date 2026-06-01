package esprit.pfe.auth.repositories;

import esprit.pfe.auth.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String emailAddress);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    User findByEmailAndUsername(String email, String username);
}
