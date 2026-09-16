package tn.esprit.d2f.competence.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnseignantCompetenceRepository extends JpaRepository<EnseignantCompetence, Long> {

    // ── Simple finders with EntityGraph to prevent N+1 ───────────────────────

    /**
     * Charge eagerly savoir → sousCompetence → competence → domaine
     * ET savoir → competence → domaine (chemin direct) en un seul JOIN.
     */
    @EntityGraph(attributePaths = {
        "savoir.sousCompetence.competence.domaine",
        "savoir.competence.domaine"
    })
    List<EnseignantCompetence> findByEnseignantId(String enseignantId);

    Optional<EnseignantCompetence> findByEnseignantIdAndSavoirId(String enseignantId, Long savoirId);

    boolean existsByEnseignantIdAndSavoirId(String enseignantId, Long savoirId);

    @EntityGraph(attributePaths = {
        "savoir.sousCompetence.competence.domaine",
        "savoir.competence.domaine"
    })
    List<EnseignantCompetence> findByEnseignantIdAndNiveau(String enseignantId, NiveauMaitrise niveau);

    // ── Paginated full-graph findAll – évite N+1 sur la liste complète ────────

    /**
     * findAll paginé avec JOIN FETCH complet des deux chemins de navigation.
     * DISTINCT élimine les doublons causés par les multiples LEFT JOIN.
     */
    @Query(
        value = """
            SELECT DISTINCT ec FROM EnseignantCompetence ec
            LEFT JOIN FETCH ec.savoir s
            LEFT JOIN FETCH s.sousCompetence sc
            LEFT JOIN FETCH sc.competence c1
            LEFT JOIN FETCH c1.domaine
            LEFT JOIN FETCH s.competence c2
            LEFT JOIN FETCH c2.domaine
        """,
        countQuery = "SELECT COUNT(DISTINCT ec) FROM EnseignantCompetence ec"
    )
    Page<EnseignantCompetence> findAllFetched(Pageable pageable);

    // ── Filtered finders – DISTINCT couvre les multi-path JOINs ──────────────

    /**
     * Couvre les deux cas : savoir via sousCompetence ET savoir directement rattaché à la compétence.
     * DISTINCT élimine les doublons dus au OR sur deux chemins de JOIN.
     */
    @Query("""
        SELECT DISTINCT ec FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN ec.savoir.competence c2
        LEFT JOIN c1.domaine d1
        LEFT JOIN c2.domaine d2
        WHERE ec.enseignantId = :enseignantId
        AND (d1.id = :domaineId OR d2.id = :domaineId)
    """)
    List<EnseignantCompetence> findByEnseignantIdAndDomaineId(@Param("enseignantId") String enseignantId,
                                                               @Param("domaineId") Long domaineId);

    /**
     * Couvre savoir via sousCompetence ET savoir direct sur la compétence.
     * DISTINCT élimine les doublons.
     */
    @Query("""
        SELECT DISTINCT ec FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN ec.savoir.competence c2
        WHERE ec.enseignantId = :enseignantId
        AND (c1.id = :competenceId OR c2.id = :competenceId)
    """)
    List<EnseignantCompetence> findByEnseignantIdAndCompetenceId(@Param("enseignantId") String enseignantId,
                                                                  @Param("competenceId") Long competenceId);

    @Query("SELECT COUNT(ec) FROM EnseignantCompetence ec WHERE ec.enseignantId = :enseignantId")
    long countByEnseignantId(@Param("enseignantId") String enseignantId);

    // ── Suppression ──────────────────────────────────────────────────────────

    @Transactional
    @Modifying
    @Query("DELETE FROM EnseignantCompetence ec WHERE ec.savoir.id = :savoirId")
    void deleteBySavoirId(@Param("savoirId") Long savoirId);

    @Transactional
    @Modifying
    @Query("DELETE FROM EnseignantCompetence ec WHERE ec.savoir.id IN :savoirIds")
    void deleteBySavoirIdIn(@Param("savoirIds") List<Long> savoirIds);

    // ── findSavoirIds – couvre les deux rattachements ───────────────────────

    @Query("""
        SELECT ec.savoir.id FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        WHERE sc.id = :sousCompetenceId
    """)
    List<Long> findSavoirIdsBySousCompetenceId(@Param("sousCompetenceId") Long sousCompetenceId);

    /** DISTINCT élimine les doublons sur les deux chemins de jointure. */
    @Query("""
        SELECT DISTINCT ec.savoir.id FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN ec.savoir.competence c2
        WHERE c1.id = :competenceId OR c2.id = :competenceId
    """)
    List<Long> findSavoirIdsByCompetenceId(@Param("competenceId") Long competenceId);

    /** DISTINCT élimine les doublons sur les multiples chemins de jointure. */
    @Query("""
        SELECT DISTINCT ec.savoir.id FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN ec.savoir.competence c2
        LEFT JOIN c1.domaine d1
        LEFT JOIN c2.domaine d2
        WHERE d1.id = :domaineId OR d2.id = :domaineId
    """)
    List<Long> findSavoirIdsByDomaineId(@Param("domaineId") Long domaineId);

    // ── COUNT DISTINCT enseignants ────────────────────────────────────────

    /** Nombre d'enseignants distincts par domaine */
    @Query("""
        SELECT COUNT(DISTINCT ec.enseignantId) FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN ec.savoir.competence c2
        LEFT JOIN c1.domaine d1
        LEFT JOIN c2.domaine d2
        WHERE d1.id = :domaineId OR d2.id = :domaineId
    """)
    long countDistinctEnseignantsByDomaineId(@Param("domaineId") Long domaineId);

    /** Nombre d'enseignants distincts par compétence */
    @Query("""
        SELECT COUNT(DISTINCT ec.enseignantId) FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN ec.savoir.competence c2
        WHERE c1.id = :competenceId OR c2.id = :competenceId
    """)
    long countDistinctEnseignantsByCompetenceId(@Param("competenceId") Long competenceId);

    /** Nombre d'enseignants distincts par sous-compétence */
    @Query("""
        SELECT COUNT(DISTINCT ec.enseignantId) FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        WHERE sc.id = :sousCompetenceId
    """)
    long countDistinctEnseignantsBySousCompetenceId(@Param("sousCompetenceId") Long sousCompetenceId);

    /** Tous les EC pour une compétence donnée (via sousCompetence OU directement) – DISTINCT obligatoire. */
    @Query("""
        SELECT DISTINCT ec FROM EnseignantCompetence ec
        LEFT JOIN ec.savoir.sousCompetence sc
        LEFT JOIN sc.competence c1
        LEFT JOIN ec.savoir.competence c2
        WHERE c1.id = :competenceId OR c2.id = :competenceId
    """)
    List<EnseignantCompetence> findByCompetenceId(@Param("competenceId") Long competenceId);
}
