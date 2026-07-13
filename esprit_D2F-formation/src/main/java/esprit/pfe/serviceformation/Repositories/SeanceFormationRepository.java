package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
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
            @Param("start") LocalDate start,
            @Param("end")   LocalDate end
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
            @Param("dateSeance") LocalDate dateSeance,
            @Param("heureDebut") LocalTime heureDebut,
            @Param("heureFin") LocalTime heureFin
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
            @Param("dateSeance") LocalDate dateSeance,
            @Param("heureDebut") LocalTime heureDebut,
            @Param("heureFin") LocalTime heureFin,
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
            @Param("date")     LocalDate date
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
            @Param("date")     LocalDate date
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
            @Param("dateSeance") LocalDate   dateSeance,
            @Param("heureDebut") LocalTime   heureDebut,
            @Param("heureFin") LocalTime     heureFin
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
            @Param("dateSeance") LocalDate   dateSeance,
            @Param("heureDebut") LocalTime   heureDebut,
            @Param("heureFin")   LocalTime   heureFin,
            @Param("idSeance")   Long   idSeance
    );

    // Pour le reminder scheduler : séances à une date donnée
    List<SeanceFormation> findByDateSeance(LocalDate dateSeance);

    // Pour l'export .ics : séances d'un animateur
    @Query("SELECT s FROM SeanceFormation s JOIN s.animateurs a WHERE a.id = :ensId")
    List<SeanceFormation> findByAnimateurs_Id(@Param("ensId") String ensId);

    // Pour l'export .ics : séances d'un participant
    @Query("SELECT s FROM SeanceFormation s JOIN s.participants p WHERE p.id = :ensId")
    List<SeanceFormation> findByParticipants_Id(@Param("ensId") String ensId);

    // ==================== CALENDRIER ====================

    /** Toutes les séances, ordonnées chronologiquement (export « tout le calendrier »). */
    @Query("""
        SELECT s FROM SeanceFormation s
        LEFT JOIN FETCH s.formation
        ORDER BY s.dateSeance, s.heureDebut
        """)
    List<SeanceFormation> findAllByOrderByDateSeanceAscHeureDebutAsc();

    /** Séances d'un participant identifié par son e-mail (export personnel par e-mail). */
    @Query("SELECT s FROM SeanceFormation s JOIN s.participants p WHERE LOWER(p.mail) = LOWER(:mail)")
    List<SeanceFormation> findByParticipantMail(@Param("mail") String mail);

    /** Séances appartenant à un ensemble de formations (résolution par e-mail importé). */
    List<SeanceFormation> findByFormation_IdFormationIn(List<Long> formationIds);

    /** Séances d'une formation, ordonnées par numéro de séance puis date. */
    List<SeanceFormation> findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(Long formationId);

    /** Nombre de séances d'une formation. */
    long countByFormation_IdFormation(Long formationId);

    /** Identifiants des formations possédant au moins une séance (export/invitations « tout »). */
    @Query("SELECT DISTINCT s.formation.idFormation FROM SeanceFormation s")
    List<Long> findDistinctFormationIds();

    /** E-mails distincts des participants (enseignants) d'une formation. */
    @Query("""
        SELECT DISTINCT LOWER(p.mail) FROM SeanceFormation s
        JOIN s.participants p
        WHERE s.formation.idFormation = :formationId AND p.mail IS NOT NULL
        """)
    List<String> findDistinctParticipantMailsByFormation(@Param("formationId") Long formationId);
}
