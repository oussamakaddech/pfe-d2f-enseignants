package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavoirRepository extends JpaRepository<Savoir, Long> {
    Optional<Savoir> findByCode(String code);
    List<Savoir> findBySousCompetenceId(Long sousCompetenceId);
    List<Savoir> findByType(TypeSavoir type);
    boolean existsByCode(String code);
}
