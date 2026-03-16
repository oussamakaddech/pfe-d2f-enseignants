package tn.esprit.d2f.competence.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.SousCompetence;

import java.util.List;
import java.util.Optional;

@Repository
public interface SousCompetenceRepository extends JpaRepository<SousCompetence, Long> {
    Optional<SousCompetence> findByCode(String code);
    List<SousCompetence> findByCompetenceId(Long competenceId);
    List<SousCompetence> findByCompetenceIdAndParentIsNull(Long competenceId);
    List<SousCompetence> findByParentId(Long parentId);
    boolean existsByParentId(Long parentId);
    boolean existsByCode(String code);

    @Query("SELECT sc FROM SousCompetence sc WHERE LOWER(sc.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<SousCompetence> searchByKeyword(@Param("keyword") String keyword);

    /** Version paginée pour les endpoints de recherche. */
    @Query(
        value = "SELECT sc FROM SousCompetence sc WHERE LOWER(sc.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.code) LIKE LOWER(CONCAT('%', :keyword, '%'))",
        countQuery = "SELECT COUNT(sc) FROM SousCompetence sc WHERE LOWER(sc.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.code) LIKE LOWER(CONCAT('%', :keyword, '%'))"
    )
    Page<SousCompetence> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /** Recherche par domaine + mot-clé (JPQL – remplace la boucle Java) */
    @Query("SELECT sc FROM SousCompetence sc JOIN sc.competence c WHERE c.domaine.id = :domaineId AND (LOWER(sc.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(sc.code) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<SousCompetence> searchByDomaineIdAndKeyword(@Param("domaineId") Long domaineId, @Param("keyword") String keyword);
}
