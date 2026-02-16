package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.SeanceFormation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.sql.Time;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;

@Repository
public interface SeanceFormationRepository extends JpaRepository<SeanceFormation, Long> {
    // ✅ AJOUTER CETTE MÉTHODE
    List<SeanceFormation> findByFormation_IdFormation(Long formationId);
    @Query("""
      SELECT DISTINCT sf.formation
      FROM SeanceFormation sf
      JOIN sf.animateurs a
      WHERE a.id = :ensId
        AND sf.dateSeance BETWEEN :start AND :end
      """)
    List<Formation> findFormationsByAnimateurAndPeriod(
            @Param("ensId") String ensId,
            @Param("start") Date start,
            @Param("end")   Date end
    );



    @Query("""
      SELECT a
      FROM SeanceFormation sf
      JOIN sf.animateurs a
      WHERE sf.formation.idFormation = :formationId
      """)
    List<Enseignant> findAnimateursByFormation(@Param("formationId") Long formationId);

    @Query("""
        SELECT CASE WHEN (COUNT(s) > 0) THEN true ELSE false END
        FROM SeanceFormation s
        WHERE s.dateSeance = :dateSeance
          AND (s.heureDebut < :heureFin AND s.heureFin > :heureDebut)
          AND (
                :enseignantId IN (SELECT a.id FROM s.animateurs a)
             OR :enseignantId IN (SELECT p.id FROM s.participants p)
          )
    """)
    boolean existsSeanceConflict(
            @Param("enseignantId") String enseignantId,
            @Param("dateSeance") Date dateSeance,
            @Param("heureDebut") Time heureDebut,
            @Param("heureFin") Time heureFin
    );

    @Query("""
        SELECT CASE WHEN (COUNT(s) > 0) THEN true ELSE false END
        FROM SeanceFormation s
        WHERE s.idSeance <> :idSeance
          AND s.dateSeance = :dateSeance
          AND (s.heureDebut < :heureFin AND s.heureFin > :heureDebut)
          AND (
                :enseignantId IN (SELECT a.id FROM s.animateurs a)
             OR :enseignantId IN (SELECT p.id FROM s.participants p)
          )
    """)
    boolean existsSeanceConflictIgnoringSelf(
            @Param("enseignantId") String enseignantId,
            @Param("dateSeance") Date dateSeance,
            @Param("heureDebut") Time heureDebut,
            @Param("heureFin") Time heureFin,
            @Param("idSeance") Long idSeance
    );

    @Query("SELECT s FROM SeanceFormation s WHERE s.formation.idFormation = :formationId")
    List<SeanceFormation> findByFormationId(@Param("formationId") Long formationId);


    // NOUVEAU : charger toutes les séances d'un animateur ce jour
    @Query("""
      SELECT s FROM SeanceFormation s
      JOIN s.animateurs a
      WHERE a.id = :userId
        AND s.dateSeance = :date
    """)
    List<SeanceFormation> findByAnimateurAndDate(
            @Param("userId") String userId,
            @Param("date")     Date date
    );

    // NOUVEAU : charger toutes les séances d'un participant ce jour
    @Query("""
      SELECT s FROM SeanceFormation s
      JOIN s.participants p
      WHERE p.id = :userId
        AND s.dateSeance = :date
    """)
    List<SeanceFormation> findByParticipantAndDate(
            @Param("userId") String userId,
            @Param("date")     Date date
    );


    @Query("""
      SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
      FROM SeanceFormation s
      WHERE UPPER(FUNCTION('replace', s.salle, ' ', ''))
            = UPPER(FUNCTION('replace', :salle,    ' ', ''))
        AND s.dateSeance = :dateSeance
        AND (s.heureDebut < :heureFin AND s.heureFin > :heureDebut)
    """)
    boolean existsSalleConflict(
            @Param("salle") String salle,
            @Param("dateSeance") Date   dateSeance,
            @Param("heureDebut") Time   heureDebut,
            @Param("heureFin") Time     heureFin
    );

    @Query("""
      SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
      FROM SeanceFormation s
      WHERE s.idSeance <> :idSeance
        AND UPPER(FUNCTION('replace', s.salle, ' ', ''))
            = UPPER(FUNCTION('replace', :salle,    ' ', ''))
        AND s.dateSeance = :dateSeance
        AND (s.heureDebut < :heureFin AND s.heureFin > :heureDebut)
    """)
    boolean existsSalleConflictIgnoringSelf(
            @Param("salle")      String salle,
            @Param("dateSeance") Date   dateSeance,
            @Param("heureDebut") Time   heureDebut,
            @Param("heureFin")   Time   heureFin,
            @Param("idSeance")   Long   idSeance
    );
}