package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.Entities.FormationCompetence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormationCompetenceRepository extends JpaRepository<FormationCompetence, Long> {
    List<FormationCompetence> findByFormationIdFormation(Long formationId);
    void deleteByFormationIdFormation(Long formationId);
    List<FormationCompetence> findByCompetenceId(Long competenceId);
    List<FormationCompetence> findByDomaineId(Long domaineId);
}