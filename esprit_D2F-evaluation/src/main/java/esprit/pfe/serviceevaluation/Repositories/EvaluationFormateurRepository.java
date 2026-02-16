package esprit.pfe.serviceevaluation.Repositories;




import esprit.pfe.serviceevaluation.Entities.EvaluationFormateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationFormateurRepository extends JpaRepository<EvaluationFormateur, Long> {
    List<EvaluationFormateur> findByFormationId(Long formationId);
}

