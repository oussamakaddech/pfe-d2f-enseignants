package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.AnimateurExterne;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnimateurExterneRepository extends JpaRepository<AnimateurExterne, Long> {
    List<AnimateurExterne> findByBureauIdOrderByNomAscPrenomAsc(Long bureauId);
    boolean existsByIdAndBureauId(Long id, Long bureauId);
}
