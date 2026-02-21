package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.SousCompetence;

import java.util.List;
import java.util.Optional;

@Repository
public interface SousCompetenceRepository extends JpaRepository<SousCompetence, Long> {
    Optional<SousCompetence> findByCode(String code);
    List<SousCompetence> findByCompetenceId(Long competenceId);
    boolean existsByCode(String code);
}
