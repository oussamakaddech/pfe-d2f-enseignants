package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavoirRepository extends JpaRepository<Savoir, Long> {
    Optional<Savoir> findByCode(String code);
    List<Savoir> findBySousCompetenceId(Long sousCompetenceId);
    List<Savoir> findByCompetenceId(Long competenceId);
    List<Savoir> findByType(TypeSavoir type);
    boolean existsByCode(String code);

    @Query("SELECT s FROM Savoir s WHERE LOWER(s.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Savoir> searchByKeyword(@Param("keyword") String keyword);
}
