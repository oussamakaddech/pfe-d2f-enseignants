package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.dto.CountHeuresDTO;
import esprit.pfe.serviceformation.dto.FormationFilter;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface FormationRepository extends JpaRepository<Formation, Long> {

  List<Formation> findDistinctBySeancesAnimateursMail(String email);

  List<Formation> findByEtatFormation(EtatFormation etatFormation);

  List<Formation> findByDepartement_Id(String deptId);

  List<Formation> findByDateDebutBetween(Date start, Date end);

  @Query("SELECT COUNT(f) FROM Formation f WHERE f.dateDebut BETWEEN :start AND :end")
  int countTotalFormations(@Param("start") Date start, @Param("end") Date end);

  @Query("SELECT COALESCE(SUM(f.chargeHoraireGlobal), 0) FROM Formation f WHERE f.dateDebut BETWEEN :start AND :end")
  int sumTotalHeures(@Param("start") Date start, @Param("end") Date end);

  @Query("SELECT COUNT(DISTINCT p.id) FROM Formation f JOIN f.seances s JOIN s.participants p WHERE f.dateDebut BETWEEN :start AND :end")
  int countUniqueParticipants(@Param("start") Date start, @Param("end") Date end);

  @Query("SELECT f.etatFormation, COUNT(f) FROM Formation f WHERE f.dateDebut BETWEEN :start AND :end GROUP BY f.etatFormation")
  List<Object[]> countFormationsByEtat(@Param("start") Date start, @Param("end") Date end);

  List<Formation> findDistinctBySeances_Animateurs_Id(String enseignantId);

  List<Formation> findDistinctBySeances_Participants_Id(String enseignantId);

  List<Formation> findByUp_Id(String upId);

  @Query("""
        SELECT NEW esprit.pfe.serviceformation.dto.CountHeuresDTO(
            COUNT(f),
            COALESCE(SUM(f.chargeHoraireGlobal), 0L)
        )
        FROM Formation f
        WHERE
          (f.competance        = :#{#filter.competence}   OR :#{#filter.competence}   IS NULL)
          AND (f.domaine        = :#{#filter.domaine}      OR :#{#filter.domaine}      IS NULL)
          AND (f.up.id          = :#{#filter.upId}         OR :#{#filter.upId}         IS NULL)
          AND (f.departement.id = :#{#filter.deptId}       OR :#{#filter.deptId}       IS NULL)
          AND (f.ouverte        = :#{#filter.ouverte}      OR :#{#filter.ouverte}      IS NULL)
          AND f.dateDebut >= COALESCE(:#{#filter.start}, f.dateDebut)
          AND f.dateDebut <= COALESCE(:#{#filter.end},   f.dateDebut)
          AND f.etatFormation IN :#{#filter.etats}
      """)
  CountHeuresDTO countAndSumHeuresWithFilters(@Param("filter") FormationFilter filter);

  @Query("""
        SELECT f.typeFormation, COUNT(f)
        FROM Formation f
        WHERE
          (:#{#filter.competence} IS NULL    OR f.competance        = :#{#filter.competence})
          AND (:#{#filter.domaine}    IS NULL OR f.domaine           = :#{#filter.domaine})
          AND (:#{#filter.upId}       IS NULL OR f.up.id             = :#{#filter.upId})
          AND (:#{#filter.deptId}     IS NULL OR f.departement.id    = :#{#filter.deptId})
          AND (:#{#filter.ouverte}    IS NULL OR f.ouverte           = :#{#filter.ouverte})
          AND (:#{#filter.start}      IS NULL OR f.dateDebut >= :#{#filter.start})
          AND (:#{#filter.end}        IS NULL OR f.dateDebut <= :#{#filter.end})
          AND f.etatFormation IN :#{#filter.etats}
        GROUP BY f.typeFormation
      """)
  List<Object[]> countFormationsByTypeWithFilters(@Param("filter") FormationFilter filter);

  @Query("""
          SELECT DISTINCT f.idFormation
          FROM Formation f
               LEFT JOIN f.seances s
               LEFT JOIN s.animateurs a
          WHERE
              (:#{#filter.competence} IS NULL     OR f.competance         = :#{#filter.competence})
              AND (:#{#filter.domaine}    IS NULL OR f.domaine            = :#{#filter.domaine})
              AND (:#{#filter.upId}       IS NULL OR f.up.id              = :#{#filter.upId})
              AND (:#{#filter.deptId}     IS NULL OR f.departement.id     = :#{#filter.deptId})
              AND (:#{#filter.ouverte}    IS NULL OR f.ouverte            = :#{#filter.ouverte})
              AND (:#{#filter.start}      IS NULL OR f.dateDebut          >= :#{#filter.start})
              AND (:#{#filter.end}        IS NULL OR f.dateDebut          <= :#{#filter.end})
              AND TRIM(f.externeFormateurEmail) <> ''
              AND f.etatFormation IN :#{#filter.etats}
              AND a.id IS NULL
      """)
  List<Long> findExterneOnlyIdsWithFilters(@Param("filter") FormationFilter filter);

  @Query("""
          SELECT DISTINCT f.idFormation
          FROM Formation f
               JOIN f.seances s
               JOIN s.animateurs a
          WHERE
              (:#{#filter.competence} IS NULL     OR f.competance         = :#{#filter.competence})
              AND (:#{#filter.domaine}    IS NULL OR f.domaine            = :#{#filter.domaine})
              AND (:#{#filter.upId}       IS NULL OR f.up.id              = :#{#filter.upId})
              AND (:#{#filter.deptId}     IS NULL OR f.departement.id     = :#{#filter.deptId})
              AND (:#{#filter.ouverte}    IS NULL OR f.ouverte            = :#{#filter.ouverte})
              AND (:#{#filter.start}      IS NULL OR f.dateDebut          >= :#{#filter.start})
              AND (:#{#filter.end}        IS NULL OR f.dateDebut          <= :#{#filter.end})
              AND (f.externeFormateurEmail IS NULL
                   OR TRIM(f.externeFormateurEmail) = '')
              AND f.etatFormation IN :#{#filter.etats}
      """)
  List<Long> findInterneOnlyIdsWithFilters(@Param("filter") FormationFilter filter);

  @Query("""
          SELECT DISTINCT f.idFormation
          FROM Formation f
               JOIN f.seances s
               JOIN s.animateurs a
          WHERE
              (:#{#filter.competence} IS NULL     OR f.competance         = :#{#filter.competence})
              AND (:#{#filter.domaine}    IS NULL OR f.domaine            = :#{#filter.domaine})
              AND (:#{#filter.upId}       IS NULL OR f.up.id              = :#{#filter.upId})
              AND (:#{#filter.deptId}     IS NULL OR f.departement.id     = :#{#filter.deptId})
              AND (:#{#filter.ouverte}    IS NULL OR f.ouverte            = :#{#filter.ouverte})
              AND (:#{#filter.start}      IS NULL OR f.dateDebut          >= :#{#filter.start})
              AND (:#{#filter.end}        IS NULL OR f.dateDebut          <= :#{#filter.end})
              AND TRIM(f.externeFormateurEmail) <> ''
              AND f.etatFormation IN :#{#filter.etats}
      """)
  List<Long> findMixteIdsWithFilters(@Param("filter") FormationFilter filter);

  List<Formation> findByInscriptionsOuvertesTrue();
}
