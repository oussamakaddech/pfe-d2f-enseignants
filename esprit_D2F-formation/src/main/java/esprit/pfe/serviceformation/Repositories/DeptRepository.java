package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.Entities.Dept;
import esprit.pfe.serviceformation.Entities.Enseignant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeptRepository extends JpaRepository<Dept, String> {
}
