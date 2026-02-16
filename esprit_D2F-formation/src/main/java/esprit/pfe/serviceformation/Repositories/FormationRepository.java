package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.DTO.CountHeuresDTO;
import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.Formation;
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

    // Récupère les formations dont la dateDebut est comprise entre 'start' et 'end'
    List<Formation> findByDateDebutBetween(Date start, Date end);

    // Compte le nombre total de formations entre 'start' et 'end'
    @Query("SELECT COUNT(f) FROM Formation f WHERE f.dateDebut BETWEEN :start AND :end")
    int countTotalFormations(@Param("start") Date start, @Param("end") Date end);

    // Calcule la somme totale des heures de formation (chargeHoraireGlobal) entre 'start' et 'end'
    @Query("SELECT COALESCE(SUM(f.chargeHoraireGlobal), 0) FROM Formation f WHERE f.dateDebut BETWEEN :start AND :end")
    int sumTotalHeures(@Param("start") Date start, @Param("end") Date end);

    // Compte le nombre de participants uniques via les séances associées aux formations entre 'start' et 'end'
    @Query("SELECT COUNT(DISTINCT p.id) FROM Formation f JOIN f.seances s JOIN s.participants p WHERE f.dateDebut BETWEEN :start AND :end")
    int countUniqueParticipants(@Param("start") Date start, @Param("end") Date end);



    // Nouvelle requête pour compter les formations par état sur une période donnée
    @Query("SELECT f.etatFormation, COUNT(f) FROM Formation f WHERE f.dateDebut BETWEEN :start AND :end GROUP BY f.etatFormation")
    List<Object[]> countFormationsByEtat(@Param("start") Date start, @Param("end") Date end);

    List<Formation> findDistinctBySeances_Animateurs_Id(String enseignantId);

    /**
     * Parcourt :
     *   Formation → seances (List<SeanceFormation>) → participants (List<Enseignant>) → id
     */
    List<Formation> findDistinctBySeances_Participants_Id(String enseignantId);


    /** 2. Toutes les formations rattachées à une UP (quel que soit leur état) */
    List<Formation> findByUp_Id(String upId);

    @Query("""
  SELECT NEW esprit.pfe.serviceformation.DTO.CountHeuresDTO(
      COUNT(f),
      COALESCE(SUM(f.chargeHoraireGlobal), 0L)
  )
  FROM Formation f
  WHERE
    (f.competance        = :competence   OR :competence   IS NULL)
    AND (f.domaine        = :domaine      OR :domaine      IS NULL)
    AND (f.up.id          = :upId         OR :upId         IS NULL)
    AND (f.departement.id = :deptId       OR :deptId       IS NULL)
    AND (f.ouverte        = :ouverte      OR :ouverte      IS NULL)
    AND f.dateDebut >= COALESCE(:start, f.dateDebut)
    AND f.dateDebut <= COALESCE(:end,   f.dateDebut)
    AND f.etatFormation IN :etats
""")
    CountHeuresDTO countAndSumHeuresWithFilters(
            @Param("competence") String competence,
            @Param("domaine")    String domaine,
            @Param("upId")       Long   upId,
            @Param("deptId")     Long   deptId,
            @Param("ouverte")    Boolean ouverte,
            @Param("start")      Date   start,
            @Param("end")        Date   end,
            @Param("etats")      List<EtatFormation> etats
    );

    @Query("""
      SELECT f.typeFormation, COUNT(f)
      FROM Formation f
      WHERE
        (:competence IS NULL    OR f.competance        = :competence)
        AND (:domaine    IS NULL OR f.domaine           = :domaine)
        AND (:upId       IS NULL OR f.up.id             = :upId)
        AND (:deptId     IS NULL OR f.departement.id    = :deptId)
        AND (:ouverte    IS NULL OR f.ouverte           = :ouverte)
        AND (:start      IS NULL OR f.dateDebut >= :start)
        AND (:end        IS NULL OR f.dateDebut <= :end)
        AND f.etatFormation IN :etats
      GROUP BY f.typeFormation
    """)
    List<Object[]> countFormationsByTypeWithFilters(
            @Param("competence") String              competence,
            @Param("domaine")    String              domaine,
            @Param("upId")       Long                upId,
            @Param("deptId")     Long                deptId,
            @Param("ouverte")    Boolean             ouverte,
            @Param("start")      Date                start,
            @Param("end")        Date                end,
            @Param("etats")      List<EtatFormation> etats
    );


    /**
     * ------------------------------------------------------------
     * 1) EXTERNE‐ONLY
     *    -> email externe NON NULL et NON vide (TRIM(email) <> '')
     *    -> AUCUN animateur (LEFT JOIN + a.id IS NULL)
     * ------------------------------------------------------------
     */
    @Query("""
        SELECT DISTINCT f.idFormation
        FROM Formation f
             LEFT JOIN f.seances s
             LEFT JOIN s.animateurs a
        WHERE 
            (:competence IS NULL     OR f.competance         = :competence)
            AND (:domaine    IS NULL OR f.domaine            = :domaine)
            AND (:upId       IS NULL OR f.up.id              = :upId)
            AND (:deptId     IS NULL OR f.departement.id     = :deptId)
            AND (:ouverte    IS NULL OR f.ouverte            = :ouverte)
            AND (:start      IS NULL OR f.dateDebut          >= :start)
            AND (:end        IS NULL OR f.dateDebut          <= :end)
            AND TRIM(f.externeFormateurEmail) <> '' 
            AND f.etatFormation IN :etats
            AND a.id IS NULL
    """)
    List<Long> findExterneOnlyIdsWithFilters(
            @Param("competence") String competence,
            @Param("domaine")    String domaine,
            @Param("upId")       Long   upId,
            @Param("deptId")     Long   deptId,
            @Param("ouverte")    Boolean ouverte,
            @Param("start")      Date   start,
            @Param("end")        Date   end,
            @Param("etats")      List<EtatFormation> etats
    );


    /**
     * ------------------------------------------------------------
     * 2) INTERNE‐ONLY
     *    -> email externe NULL ou vide (TRIM(email) = '')
     *    -> AU MOINS un animateur (JOIN f.seances s JOIN s.animateurs a)
     * ------------------------------------------------------------
     */
    @Query("""
        SELECT DISTINCT f.idFormation
        FROM Formation f
             JOIN f.seances s
             JOIN s.animateurs a
        WHERE 
            (:competence IS NULL     OR f.competance         = :competence)
            AND (:domaine    IS NULL OR f.domaine            = :domaine)
            AND (:upId       IS NULL OR f.up.id              = :upId)
            AND (:deptId     IS NULL OR f.departement.id     = :deptId)
            AND (:ouverte    IS NULL OR f.ouverte            = :ouverte)
            AND (:start      IS NULL OR f.dateDebut          >= :start)
            AND (:end        IS NULL OR f.dateDebut          <= :end)
            AND (f.externeFormateurEmail IS NULL 
                 OR TRIM(f.externeFormateurEmail) = '')
            AND f.etatFormation IN :etats
    """)
    List<Long> findInterneOnlyIdsWithFilters(
            @Param("competence") String competence,
            @Param("domaine")    String domaine,
            @Param("upId")       Long   upId,
            @Param("deptId")     Long   deptId,
            @Param("ouverte")    Boolean ouverte,
            @Param("start")      Date   start,
            @Param("end")        Date   end,
            @Param("etats")      List<EtatFormation> etats
    );


    /**
     * ------------------------------------------------------------
     * 3) MIXTE
     *    -> email externe NON NULL et NON vide (TRIM(email) <> '')
     *    -> AU MOINS un animateur (JOIN f.seances s JOIN s.animateurs a)
     * ------------------------------------------------------------
     */
    @Query("""
        SELECT DISTINCT f.idFormation
        FROM Formation f
             JOIN f.seances s
             JOIN s.animateurs a
        WHERE 
            (:competence IS NULL     OR f.competance         = :competence)
            AND (:domaine    IS NULL OR f.domaine            = :domaine)
            AND (:upId       IS NULL OR f.up.id              = :upId)
            AND (:deptId     IS NULL OR f.departement.id     = :deptId)
            AND (:ouverte    IS NULL OR f.ouverte            = :ouverte)
            AND (:start      IS NULL OR f.dateDebut          >= :start)
            AND (:end        IS NULL OR f.dateDebut          <= :end)
            AND TRIM(f.externeFormateurEmail) <> ''
            AND f.etatFormation IN :etats
    """)
    List<Long> findMixteIdsWithFilters(
            @Param("competence") String competence,
            @Param("domaine")    String domaine,
            @Param("upId")       Long   upId,
            @Param("deptId")     Long   deptId,
            @Param("ouverte")    Boolean ouverte,
            @Param("start")      Date   start,
            @Param("end")        Date   end,
            @Param("etats")      List<EtatFormation> etats
    );
}
