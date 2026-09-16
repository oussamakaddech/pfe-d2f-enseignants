package esprit.pfe.serviceformation.repositories;


import esprit.pfe.serviceformation.entities.Enseignant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnseignantRepository extends JpaRepository<Enseignant, String>, JpaSpecificationExecutor<Enseignant> {

    /** Grades distincts non nuls (référentiel pour les filtres de la page unifiée). */
    @Query("SELECT DISTINCT e.grade FROM Enseignant e WHERE e.grade IS NOT NULL AND e.grade <> '' ORDER BY e.grade")
    List<String> findDistinctGrades();

    Optional<Enseignant> findByMail(String mail);

    /** Fiche enseignant liée à un compte auth (résolution du périmètre CHEF_DEPARTEMENT). */
    Optional<Enseignant> findByUserId(String userId);

    /** Résolution par email tolérante (casse/espaces) — utilisée pour retrouver
     *  un enseignant existant lors d'un conflit de création. */
    Optional<Enseignant> findByMailIgnoreCase(String mail);

    boolean existsByMail(String mail);

    /** Enseignant dont l'id est le plus grand (ordre lexicographique), pour l'auto-incrément.
     *  Requête native volontaire : elle ignore le filtre soft-delete (@SQLRestriction) afin
     *  que les ids des enseignants supprimés soient pris en compte → pas de collision de PK.
     *  Le placeholder {@code {h-schema}} est résolu par Hibernate via
     *  {@code hibernate.default_schema} (= formation.) : la requête reste qualifiée même quand
     *  l'URL JDBC ne fixe pas {@code currentSchema} (le search_path retombe sinon sur public). */
    @Query(value = "SELECT * FROM {h-schema}enseignants ORDER BY id DESC LIMIT 1", nativeQuery = true)
    Optional<Enseignant> findTopByOrderByIdDesc();

    /**
     * Plus grand suffixe numérique parmi les ids au format {@code E#####}, en
     * INCLUANT les enseignants soft-deleted (la PK {@code enseignants_pkey} porte
     * sur la ligne physique : un id supprimé occupe toujours sa clé). Le filtre
     * regex {@code ~ '^E[0-9]+$'} ignore les ids non conformes (dérivés d'un nom,
     * uuid…) qui faisaient échouer le parsing → repli erroné sur E00001. Renvoie
     * 0 si aucune ligne conforme. Requête native : non soumise au
     * {@code @SQLRestriction("deleted_at IS NULL")}.
     */
    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)), 0) "
            + "FROM {h-schema}enseignants WHERE id ~ '^E[0-9]+$'", nativeQuery = true)
    int findMaxNumericIdIncludingDeleted();

    /** Existence d'un id sur la ligne physique (soft-deleted compris) — anti-collision PK. */
    @Query(value = "SELECT EXISTS(SELECT 1 FROM {h-schema}enseignants WHERE id = :id)", nativeQuery = true)
    boolean existsByIdIncludingDeleted(@Param("id") String id);
    @Query("""
      SELECT e
      FROM Enseignant e
      WHERE NOT EXISTS (
        SELECT 1
        FROM SeanceFormation s
        JOIN s.animateurs a
        WHERE a.id = e.id
          AND s.dateSeance BETWEEN :start AND :end
      )
      AND NOT EXISTS (
        SELECT 1
        FROM SeanceFormation s2
        JOIN s2.participants p
        WHERE p.id = e.id
          AND s2.dateSeance BETWEEN :start AND :end
      )
    """)
    List<Enseignant> findEnseignantsNonAffectesSurPeriode(
            @Param("start") LocalDate start,
            @Param("end")   LocalDate end
    );
    List<Enseignant> findByUpAndCup(esprit.pfe.serviceformation.entities.Up up, String cup);
    List<Enseignant> findByCup(String cup);

    List<Enseignant> findByDeptIdIn(List<String> deptIds);
    List<Enseignant> findByUpIdIn(List<String> upIds);
}
