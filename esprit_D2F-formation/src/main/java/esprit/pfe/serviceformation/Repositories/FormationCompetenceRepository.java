package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.FormationCompetence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormationCompetenceRepository extends JpaRepository<FormationCompetence, Long> {
    Page<FormationCompetence> findByFormationIdFormation(Long formationId, Pageable pageable);
    List<FormationCompetence> findByFormationIdFormation(Long formationId);
    void deleteByFormationIdFormation(Long formationId);
    Page<FormationCompetence> findByCompetenceId(Long competenceId, Pageable pageable);
    List<FormationCompetence> findByCompetenceId(Long competenceId);
    Page<FormationCompetence> findByDomaineId(Long domaineId, Pageable pageable);
    List<FormationCompetence> findByDomaineId(Long domaineId);
}
