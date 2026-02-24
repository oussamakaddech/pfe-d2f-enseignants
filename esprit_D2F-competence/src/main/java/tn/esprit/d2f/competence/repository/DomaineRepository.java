package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.Domaine;

import java.util.List;
import java.util.Optional;

@Repository
public interface DomaineRepository extends JpaRepository<Domaine, Long> {
    Optional<Domaine> findByCode(String code);
    List<Domaine> findByActifTrue();
    boolean existsByCode(String code);

    @Query("SELECT d FROM Domaine d WHERE LOWER(d.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Domaine> searchByKeyword(@Param("keyword") String keyword);
}
