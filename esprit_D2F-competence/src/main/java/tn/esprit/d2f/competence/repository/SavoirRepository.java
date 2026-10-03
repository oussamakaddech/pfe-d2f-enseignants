package tn.esprit.d2f.competence.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    Optional<Savoir> findByCodeIgnoreCase(String code);
    List<Savoir> findBySousCompetenceId(Long sousCompetenceId);
    List<Savoir> findByCompetenceId(Long competenceId);
    boolean existsByCompetenceId(Long competenceId);
    List<Savoir> findByType(TypeSavoir type);
    boolean existsByCode(String code);

    /** IDs des savoirs directement rattachés à une compétence (sans sous-compétence) */
    @Query("SELECT s.id FROM Savoir s WHERE s.competence.id = :competenceId")
    List<Long> findIdsByCompetenceId(@Param("competenceId") Long competenceId);

    /** IDs des savoirs rattachés à une sous-compétence */
    @Query("SELECT s.id FROM Savoir s WHERE s.sousCompetence.id = :sousCompetenceId")
    List<Long> findIdsBySousCompetenceId(@Param("sousCompetenceId") Long sousCompetenceId);

    /**
     * IDs de tous les savoirs appartenant à un domaine (via sous-compétence ou compétence directe).
     *
     * <p>LEFT JOIN explicites obligatoires : les navigations implicites en OR
     * génèrent des INNER JOIN qui excluent les savoirs dont l'autre parent est
     * NULL (ex. savoirs directs quand on joint via sousCompetence) – la méthode
     * renvoyait alors une liste incomplète (voire vide), ce qui laissait des
     * lignes orphelines et provoquait des 409 lors des suppressions en cascade.
     */
    @Query("""
        SELECT DISTINCT s.id FROM Savoir s
        LEFT JOIN s.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN s.competence c2
        LEFT JOIN c1.domaine d1
        LEFT JOIN c2.domaine d2
        WHERE d1.id = :domaineId OR d2.id = :domaineId
    """)
    List<Long> findIdsByDomaineId(@Param("domaineId") Long domaineId);

    @Query("SELECT s FROM Savoir s WHERE LOWER(s.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Savoir> searchByKeyword(@Param("keyword") String keyword);

    /**
     * Search savoirs within a specific domaine (via competence.domaine or sousCompetence.competence.domaine).
     *
     * <p>LEFT JOIN explicites obligatoires (même raison que {@link #findIdsByDomaineId(Long)} :
     * les navigations implicites produisent des INNER JOIN qui filtrent les savoirs
     * dont l'autre parent est NULL).
     */
    @Query("""
        SELECT s FROM Savoir s
        LEFT JOIN s.competence c1
        LEFT JOIN s.sousCompetence sc
        LEFT JOIN sc.competence c2
        WHERE (c1.domaine.id = :domaineId OR c2.domaine.id = :domaineId) AND
        (LOWER(s.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
         LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
         LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
    List<Savoir> searchByDomaineIdAndKeyword(@Param("domaineId") Long domaineId, @Param("keyword") String keyword);

    /** Version paginée pour les endpoints de recherche. */
    @Query(
        value = "SELECT s FROM Savoir s WHERE LOWER(s.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%'))",
        countQuery = "SELECT COUNT(s) FROM Savoir s WHERE LOWER(s.nom) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%'))"
    )
    Page<Savoir> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

}
