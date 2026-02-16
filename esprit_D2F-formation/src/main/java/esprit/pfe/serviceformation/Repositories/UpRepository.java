package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.Entities.Dept;
import esprit.pfe.serviceformation.Entities.Up;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UpRepository extends JpaRepository<Up, String> {
}
