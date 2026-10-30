package esprit.pfe.serviceevaluation.repositories;

import esprit.pfe.serviceevaluation.entities.FormationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormationFeedbackRepository extends JpaRepository<FormationFeedback, Long> {

    boolean existsByFormationIdAndEnseignantId(Long formationId, String enseignantId);

    List<FormationFeedback> findByEnseignantId(String enseignantId);

    List<FormationFeedback> findByParticipantEmailIgnoreCase(String email);

    List<FormationFeedback> findByFormationId(Long formationId);
}
