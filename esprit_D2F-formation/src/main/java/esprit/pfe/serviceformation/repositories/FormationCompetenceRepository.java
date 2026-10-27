package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.FormationCompetence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FormationCompetenceRepository extends JpaRepository<FormationCompetence, Long> {
    Page<FormationCompetence> findByFormationIdFormation(Long formationId, Pageable pageable);
    List<FormationCompetence> findByFormationIdFormation(Long formationId);
    void deleteByFormationIdFormation(Long formationId);

    // Les liens d'une formation archivée (soft delete) restent en base : sans ce
    // filtre, la sérialisation charge une Formation masquée par @SQLRestriction
    // et échoue (« Unable to find Formation with id … » → 500).
    @Query(value = "SELECT fc FROM FormationCompetence fc JOIN fc.formation f "
            + "WHERE fc.competenceId = :competenceId AND f.deletedAt IS NULL",
            countQuery = "SELECT COUNT(fc) FROM FormationCompetence fc JOIN fc.formation f "
            + "WHERE fc.competenceId = :competenceId AND f.deletedAt IS NULL")
    Page<FormationCompetence> findByCompetenceId(@Param("competenceId") Long competenceId, Pageable pageable);

    @Query("SELECT fc FROM FormationCompetence fc JOIN fc.formation f "
            + "WHERE fc.competenceId = :competenceId AND f.deletedAt IS NULL")
    List<FormationCompetence> findByCompetenceId(@Param("competenceId") Long competenceId);

    @Query(value = "SELECT fc FROM FormationCompetence fc JOIN fc.formation f "
            + "WHERE fc.domaineId = :domaineId AND f.deletedAt IS NULL",
            countQuery = "SELECT COUNT(fc) FROM FormationCompetence fc JOIN fc.formation f "
            + "WHERE fc.domaineId = :domaineId AND f.deletedAt IS NULL")
    Page<FormationCompetence> findByDomaineId(@Param("domaineId") Long domaineId, Pageable pageable);

    @Query("SELECT fc FROM FormationCompetence fc JOIN fc.formation f "
            + "WHERE fc.domaineId = :domaineId AND f.deletedAt IS NULL")
    List<FormationCompetence> findByDomaineId(@Param("domaineId") Long domaineId);

    /**
     * Nombre de formations DISTINCTES rattachées à chaque compétence du
     * référentiel (table de liaison), sur la période de début de formation et le
     * périmètre demandé (CUP → UP, chef → département).
     *
     * <p>Le libellé est résolu côté service (competenceNom, repli
     * « Compétence {id} ») : une concaténation JPQL dépendrait du dialecte.
     * Ligne = [competenceNom (nullable), competenceId, nombre de formations].</p>
     */
    @Query("""
            SELECT fc.competenceNom, fc.competenceId, COUNT(DISTINCT f.idFormation)
            FROM FormationCompetence fc JOIN fc.formation f
            WHERE f.dateDebut BETWEEN :start AND :end
              AND (:upId IS NULL OR f.up.id = :upId)
              AND (:deptId IS NULL OR f.departement.id = :deptId)
            GROUP BY fc.competenceId, fc.competenceNom
            ORDER BY COUNT(DISTINCT f.idFormation) DESC
            """)
    List<Object[]> countFormationsByCompetenceReferentielScoped(
            @Param("start") LocalDate start, @Param("end") LocalDate end,
            @Param("upId") String upId, @Param("deptId") String deptId);
}
