package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnseignantCompetenceRepository extends JpaRepository<EnseignantCompetence, Long> {

    List<EnseignantCompetence> findByEnseignantId(String enseignantId);

    Optional<EnseignantCompetence> findByEnseignantIdAndSavoirId(String enseignantId, Long savoirId);

    boolean existsByEnseignantIdAndSavoirId(String enseignantId, Long savoirId);

    List<EnseignantCompetence> findByEnseignantIdAndNiveau(String enseignantId, NiveauMaitrise niveau);

    @Query("SELECT ec FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.competence.domaine.id = :domaineId AND ec.enseignantId = :enseignantId")
    List<EnseignantCompetence> findByEnseignantIdAndDomaineId(@Param("enseignantId") String enseignantId, @Param("domaineId") Long domaineId);

    @Query("SELECT ec FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.competence.id = :competenceId AND ec.enseignantId = :enseignantId")
    List<EnseignantCompetence> findByEnseignantIdAndCompetenceId(@Param("enseignantId") String enseignantId, @Param("competenceId") Long competenceId);

    @Query("SELECT COUNT(ec) FROM EnseignantCompetence ec WHERE ec.enseignantId = :enseignantId")
    long countByEnseignantId(@Param("enseignantId") String enseignantId);
}
