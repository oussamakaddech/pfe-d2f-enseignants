package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.Up;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UpRepository extends JpaRepository<Up, String> {
}
