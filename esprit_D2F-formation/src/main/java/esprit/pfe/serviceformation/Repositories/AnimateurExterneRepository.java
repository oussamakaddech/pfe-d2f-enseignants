package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.AnimateurExterne;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnimateurExterneRepository extends JpaRepository<AnimateurExterne, Long> {
    List<AnimateurExterne> findByBureauIdOrderByNomAscPrenomAsc(Long bureauId);
    Page<AnimateurExterne> findByBureauIdOrderByNomAscPrenomAsc(Long bureauId, Pageable pageable);
    boolean existsByIdAndBureauId(Long id, Long bureauId);
}
