package esprit.pfe.serviceevaluation.Repositories;

import esprit.pfe.serviceevaluation.Entities.EvaluationGlobale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EvaluationGlobaleRepository extends JpaRepository<EvaluationGlobale, Long> {
    Optional<EvaluationGlobale> findByFormationId(Long formationId);
    boolean existsByFormationId(Long formationId);
}