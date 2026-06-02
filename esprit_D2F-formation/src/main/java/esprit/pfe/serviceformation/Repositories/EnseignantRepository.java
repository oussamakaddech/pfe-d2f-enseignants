package esprit.pfe.serviceformation.repositories;


import esprit.pfe.serviceformation.entities.Enseignant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnseignantRepository extends JpaRepository<Enseignant, String> {

    Optional<Enseignant> findByMail(String mail);

    boolean existsByMail(String mail);

    /** Enseignant dont l'id est le plus grand (ordre lexicographique), pour l'auto-incrément.
     *  Requête native volontaire : elle ignore le filtre soft-delete (@SQLRestriction) afin
     *  que les ids des enseignants supprimés soient pris en compte → pas de collision de PK. */
    @Query(value = "SELECT * FROM enseignants ORDER BY id DESC LIMIT 1", nativeQuery = true)
    Optional<Enseignant> findTopByOrderByIdDesc();
    @Query("""
      SELECT e
      FROM Enseignant e
      WHERE NOT EXISTS (
        SELECT 1
        FROM SeanceFormation s
        JOIN s.animateurs a
        WHERE a.id = e.id
          AND s.dateSeance BETWEEN :start AND :end
      )
      AND NOT EXISTS (
        SELECT 1
        FROM SeanceFormation s2
        JOIN s2.participants p
        WHERE p.id = e.id
          AND s2.dateSeance BETWEEN :start AND :end
      )
    """)
    List<Enseignant> findEnseignantsNonAffectesSurPeriode(
            @Param("start") Date start,
            @Param("end")   Date end
    );
    List<Enseignant> findByUpAndCup(esprit.pfe.serviceformation.entities.Up up, String cup);
    List<Enseignant> findByCup(String cup);

    List<Enseignant> findByDeptIdIn(List<String> deptIds);
    List<Enseignant> findByUpIdIn(List<String> upIds);
}
