package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.Dept;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeptRepository extends JpaRepository<Dept, String> {
}
