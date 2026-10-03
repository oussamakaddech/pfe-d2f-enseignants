package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.FormationCompetence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
