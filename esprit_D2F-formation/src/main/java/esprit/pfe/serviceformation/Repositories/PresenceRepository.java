package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.DTO.EnseignantStatsDTO;
import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.Presence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface PresenceRepository extends JpaRepository<Presence, Long> {
    @Query("""
      SELECT DISTINCT p.seanceFormation.formation
      FROM Presence p
      WHERE p.enseignant.id = :ensId
        AND p.seanceFormation.dateSeance BETWEEN :start AND :end
      """)
    List<Formation> findFormationsByParticipantAndPeriod(
            @Param("ensId") String ensId,
            @Param("start") Date start,
            @Param("end")   Date end
    );

    @Query("""
      SELECT p.enseignant
      FROM Presence p
      WHERE p.presence = true
        AND p.seanceFormation.formation.idFormation = :formationId
      GROUP BY p.enseignant
      HAVING COUNT(p) = (
        SELECT COUNT(sf)
        FROM SeanceFormation sf
        WHERE sf.formation.idFormation = :formationId
      )
    """)
    List<Enseignant> findEnseignantsPresentSurToutesLesSeances(
            @Param("formationId") Long formationId
    );

   /* @Query("SELECT DISTINCT p FROM Presence p " +
            "WHERE p.presence = true " +
            "  AND p.seanceFormation.formation.idFormation = :formationId")
    List<Presence> findAllPresentByFormationId(@Param("formationId") Long formationId);
*/

    @Query("SELECT COUNT(p) FROM Presence p WHERE p.seanceFormation.formation.idFormation = :formationId " +
            "AND p.seanceFormation.dateSeance BETWEEN :startDate AND :endDate")
    long countByFormationIdAndPeriod(@Param("formationId") Long formationId,
                                     @Param("startDate") Date startDate,
                                     @Param("endDate") Date endDate);

    @Query("SELECT COUNT(p) FROM Presence p WHERE p.seanceFormation.formation.idFormation = :formationId " +
            "AND p.seanceFormation.dateSeance BETWEEN :startDate AND :endDate " +
            "AND p.presence = true")
    long countPresentByFormationIdAndPeriod(@Param("formationId") Long formationId,
                                            @Param("startDate") Date startDate,
                                            @Param("endDate") Date endDate);



   /* @Query("""
      SELECT new esprit.pfe.serviceformation.DTO.EnseignantStatsDTO(
        e.id,
        e.nom,
        e.prenom,
        COALESCE(COUNT(p), 0)
      )
      FROM Enseignant e
      LEFT JOIN e.presences p
        ON p.presence = true
       AND p.seanceFormation.dateSeance BETWEEN :start AND :end
       AND ( :upId   IS NULL OR p.seanceFormation.formation.up.id         = :upId   )
       AND ( :deptId IS NULL OR p.seanceFormation.formation.departement.id = :deptId )
      GROUP BY e.id, e.nom, e.prenom
      ORDER BY COALESCE(COUNT(p), 0) DESC
    """)
    List<EnseignantStatsDTO> findTopParticipants(
            @Param("upId")   String upId,    // null pour ignorer le filtre UP
            @Param("deptId") String deptId,  // null pour ignorer le filtre Département
            @Param("start")  Date   start,
            @Param("end")    Date   end
    );*/


   @Query("""
      SELECT new esprit.pfe.serviceformation.DTO.EnseignantStatsDTO(
        e.id,
        e.nom,
        e.prenom,
        COUNT(p)
      )
      FROM Presence p
      JOIN p.enseignant e
      WHERE p.presence = true
        AND p.seanceFormation.dateSeance BETWEEN :start AND :end
        AND p.seanceFormation.formation.etatFormation = :etat
        AND (:upId   IS NULL OR p.seanceFormation.formation.up.id         = :upId)
        AND (:deptId IS NULL OR p.seanceFormation.formation.departement.id = :deptId)
      GROUP BY e.id, e.nom, e.prenom
      ORDER BY COUNT(p) DESC
    """)
   List<EnseignantStatsDTO> findTopParticipants(
           @Param("upId")   String upId,
           @Param("deptId") String deptId,
           @Param("start")  Date   start,
           @Param("end")    Date   end,
           @Param("etat")   EtatFormation etat
   );

    // ——— Top absentees (plus absents) pour FORMATIONS ACHEVEES ———
    @Query("""
      SELECT new esprit.pfe.serviceformation.DTO.EnseignantStatsDTO(
        e.id,
        e.nom,
        e.prenom,
        COUNT(p)
      )
      FROM Presence p
      JOIN p.enseignant e
      WHERE p.presence = false
        AND p.seanceFormation.dateSeance BETWEEN :start AND :end
        AND p.seanceFormation.formation.etatFormation = :etat
        AND (:upId   IS NULL OR p.seanceFormation.formation.up.id         = :upId)
        AND (:deptId IS NULL OR p.seanceFormation.formation.departement.id = :deptId)
      GROUP BY e.id, e.nom, e.prenom
      ORDER BY COUNT(p) DESC
    """)
    List<EnseignantStatsDTO> findTopAbsentees(
            @Param("upId")   String upId,
            @Param("deptId") String deptId,
            @Param("start")  Date   start,
            @Param("end")    Date   end,
            @Param("etat")   EtatFormation etat
    );


    List<Presence> findBySeanceFormation_IdSeance(Long seanceId);
}
