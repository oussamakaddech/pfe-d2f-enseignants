package esprit.pfe.serviceevaluation.repositories;




import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationFormateurRepository extends JpaRepository<EvaluationFormateur, Long> {
    List<EvaluationFormateur> findByFormationId(Long formationId);
    Page<EvaluationFormateur> findByEnseignantId(String enseignantId, Pageable pageable);
}

