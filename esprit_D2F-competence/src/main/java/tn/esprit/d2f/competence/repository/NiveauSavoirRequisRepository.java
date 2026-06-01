package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.NiveauSavoirRequis;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;

@Repository
public interface NiveauSavoirRequisRepository extends JpaRepository<NiveauSavoirRequis, Long> {

    List<NiveauSavoirRequis> findByCompetenceId(Long competenceId);

    List<NiveauSavoirRequis> findBySousCompetenceId(Long sousCompetenceId);

    List<NiveauSavoirRequis> findByCompetenceIdAndNiveau(Long competenceId, NiveauMaitrise niveau);

    List<NiveauSavoirRequis> findBySousCompetenceIdAndNiveau(Long sousCompetenceId, NiveauMaitrise niveau);

    boolean existsByCompetenceIdAndNiveauAndSavoirId(Long competenceId, NiveauMaitrise niveau, Long savoirId);

    boolean existsBySousCompetenceIdAndNiveauAndSavoirId(Long sousCompetenceId, NiveauMaitrise niveau, Long savoirId);

    // ─── Bulk DELETE (JPQL) – s'exécutent AVANT les cascades Hibernate ──────

    @Modifying
    @Query("DELETE FROM NiveauSavoirRequis n WHERE n.competence.id = :competenceId")
    void deleteByCompetenceId(@Param("competenceId") Long competenceId);

    @Modifying
    @Query("DELETE FROM NiveauSavoirRequis n WHERE n.sousCompetence.id = :sousCompetenceId")
    void deleteBySousCompetenceId(@Param("sousCompetenceId") Long sousCompetenceId);

    @Modifying
    @Query("DELETE FROM NiveauSavoirRequis n WHERE n.savoir.id = :savoirId")
    void deleteBySavoirId(@Param("savoirId") Long savoirId);

    @Modifying
    @Query("DELETE FROM NiveauSavoirRequis n WHERE n.savoir.id IN :savoirIds")
    void deleteBySavoirIdIn(@Param("savoirIds") List<Long> savoirIds);

    @Modifying
    @Query("DELETE FROM NiveauSavoirRequis n WHERE n.competence.domaine.id = :domaineId")
    void deleteByCompetence_DomaineId(@Param("domaineId") Long domaineId);

    @Modifying
    @Query("DELETE FROM NiveauSavoirRequis n WHERE n.sousCompetence.competence.id = :competenceId")
    void deleteBySousCompetence_CompetenceId(@Param("competenceId") Long competenceId);

    @Modifying
    @Query("DELETE FROM NiveauSavoirRequis n WHERE n.sousCompetence.competence.domaine.id = :domaineId")
    void deleteBySousCompetence_Competence_DomaineId(@Param("domaineId") Long domaineId);
}
