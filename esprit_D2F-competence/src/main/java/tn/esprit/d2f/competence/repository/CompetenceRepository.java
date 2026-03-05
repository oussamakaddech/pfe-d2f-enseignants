package tn.esprit.d2f.competence.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.Competence;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompetenceRepository extends JpaRepository<Competence, Long> {
    Optional<Competence> findByCode(String code);
    List<Competence> findByDomaineId(Long domaineId);
    boolean existsByCode(String code);

    /** Eager-load domaine – full list (used internally) */
    @Query("SELECT c FROM Competence c JOIN FETCH c.domaine")
    List<Competence> findAllWithDomaine();

    /** Paginated version with JOIN FETCH domaine */
    @Query(value = "SELECT c FROM Competence c JOIN FETCH c.domaine",
           countQuery = "SELECT COUNT(c) FROM Competence c")
    Page<Competence> findAllWithDomaine(Pageable pageable);

    /** JOIN FETCH domaine filtré par domaineId */
    @Query("SELECT c FROM Competence c JOIN FETCH c.domaine d WHERE d.id = :domaineId")
    List<Competence> findByDomaineIdWithDomaine(@Param("domaineId") Long domaineId);

    @Query("SELECT c FROM Competence c WHERE LOWER(c.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Competence> searchByKeyword(@Param("keyword") String keyword);

    /** Version paginée pour les endpoints de recherche. */
    @Query(
        value = "SELECT c FROM Competence c WHERE LOWER(c.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))",
        countQuery = "SELECT COUNT(c) FROM Competence c WHERE LOWER(c.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))"
    )
    Page<Competence> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /** Recherche par domaine + mot-clé (JPQL – remplace la boucle Java) */
    @Query("SELECT c FROM Competence c WHERE c.domaine.id = :domaineId AND (LOWER(c.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Competence> searchByDomaineIdAndKeyword(@Param("domaineId") Long domaineId, @Param("keyword") String keyword);
}
