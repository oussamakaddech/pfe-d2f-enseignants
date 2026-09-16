package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO;
import tn.esprit.d2f.competence.entity.CompetencePrerequisite;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompetencePrerequisiteRepository extends JpaRepository<CompetencePrerequisite, Long> {

    @Query("""
        SELECT new tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO(
            cp.id,
            c.id,
            c.nom,
            p.id,
            p.nom,
            p.code,
            cp.niveauMinimum,
            cp.description,
            cp.createdAt
        )
        FROM CompetencePrerequisite cp
        JOIN cp.competence c
        JOIN cp.prerequisite p
        WHERE c.id = :competenceId
        ORDER BY p.nom
    """)
    List<CompetencePrerequisiteDTO> findByCompetenceId(@Param("competenceId") Long competenceId);

    @Query("""
        SELECT new tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO(
            cp.id,
            c.id,
            c.nom,
            p.id,
            p.nom,
            p.code,
            cp.niveauMinimum,
            cp.description,
            cp.createdAt
        )
        FROM CompetencePrerequisite cp
        JOIN cp.competence c
        JOIN cp.prerequisite p
        WHERE p.id = :prerequisiteId
        ORDER BY c.nom
    """)
    List<CompetencePrerequisiteDTO> findByPrerequisiteId(@Param("prerequisiteId") Long prerequisiteId);

    @Query("""
        SELECT CASE WHEN COUNT(cp) > 0 THEN true ELSE false END
        FROM CompetencePrerequisite cp
        WHERE cp.competence.id = :competenceId AND cp.prerequisite.id = :prerequisiteId
    """)
    boolean existsByCompetenceIdAndPrerequisiteId(@Param("competenceId") Long competenceId,
                                                  @Param("prerequisiteId") Long prerequisiteId);

    @Transactional
    @Modifying
    @Query("""
        DELETE FROM CompetencePrerequisite cp
        WHERE cp.competence.id = :competenceId AND cp.prerequisite.id = :prerequisiteId
    """)
    void deleteByCompetenceIdAndPrerequisiteId(@Param("competenceId") Long competenceId,
                                               @Param("prerequisiteId") Long prerequisiteId);

    @Query("""
        SELECT cp FROM CompetencePrerequisite cp
        WHERE cp.id = :id AND cp.competence.id = :competenceId
    """)
    Optional<CompetencePrerequisite> findByIdAndCompetenceId(@Param("id") Long id,
                                                              @Param("competenceId") Long competenceId);

    @Query("SELECT COUNT(cp) FROM CompetencePrerequisite cp WHERE cp.competence.id = :competenceId")
    long countByCompetenceId(@Param("competenceId") Long competenceId);

    @Query("SELECT cp.prerequisite.id FROM CompetencePrerequisite cp WHERE cp.competence.id = :competenceId")
    List<Long> findPrerequisiteIdsByCompetenceId(@Param("competenceId") Long competenceId);

    @Query("SELECT cp.prerequisite.nom FROM CompetencePrerequisite cp WHERE cp.competence.id = :competenceId ORDER BY cp.prerequisite.nom")
    List<String> findPrerequisiteNamesByCompetenceId(@Param("competenceId") Long competenceId);
}
