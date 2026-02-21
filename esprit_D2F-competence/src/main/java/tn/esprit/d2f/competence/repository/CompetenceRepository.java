package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.Competence;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompetenceRepository extends JpaRepository<Competence, Long> {
    Optional<Competence> findByCode(String code);
    List<Competence> findByDomaineId(Long domaineId);
    boolean existsByCode(String code);
}
