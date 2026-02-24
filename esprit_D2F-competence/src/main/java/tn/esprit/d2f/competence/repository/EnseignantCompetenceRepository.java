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

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM EnseignantCompetence ec WHERE ec.savoir.id = :savoirId")
    void deleteBySavoirId(@Param("savoirId") Long savoirId);

    @Query("DELETE FROM EnseignantCompetence ec WHERE ec.savoir.id IN :savoirIds")
    @org.springframework.data.jpa.repository.Modifying
    void deleteBySavoirIdIn(@Param("savoirIds") List<Long> savoirIds);

    @Query("SELECT ec.savoir.id FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.id = :sousCompetenceId")
    List<Long> findSavoirIdsBySousCompetenceId(@Param("sousCompetenceId") Long sousCompetenceId);

    @Query("SELECT ec.savoir.id FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.competence.id = :competenceId")
    List<Long> findSavoirIdsByCompetenceId(@Param("competenceId") Long competenceId);

    @Query("SELECT ec.savoir.id FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.competence.domaine.id = :domaineId")
    List<Long> findSavoirIdsByDomaineId(@Param("domaineId") Long domaineId);

    /** Nombre d'enseignants distincts par domaine */
    @Query("SELECT COUNT(DISTINCT ec.enseignantId) FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.competence.domaine.id = :domaineId")
    long countDistinctEnseignantsByDomaineId(@Param("domaineId") Long domaineId);

    /** Nombre d'enseignants distincts par compétence */
    @Query("SELECT COUNT(DISTINCT ec.enseignantId) FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.competence.id = :competenceId")
    long countDistinctEnseignantsByCompetenceId(@Param("competenceId") Long competenceId);

    /** Nombre d'enseignants distincts par sous-compétence */
    @Query("SELECT COUNT(DISTINCT ec.enseignantId) FROM EnseignantCompetence ec WHERE ec.savoir.sousCompetence.id = :sousCompetenceId")
    long countDistinctEnseignantsBySousCompetenceId(@Param("sousCompetenceId") Long sousCompetenceId);
}
