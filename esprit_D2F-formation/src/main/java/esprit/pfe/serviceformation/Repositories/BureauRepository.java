package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.Bureau;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BureauRepository extends JpaRepository<Bureau, Long> {
    Optional<Bureau> findByEmail(String email);
    boolean existsByEmail(String email);
}
