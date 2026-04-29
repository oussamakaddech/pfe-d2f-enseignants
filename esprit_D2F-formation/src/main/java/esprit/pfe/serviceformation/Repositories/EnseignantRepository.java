package esprit.pfe.serviceformation.Repositories;


import esprit.pfe.serviceformation.Entities.Enseignant;
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

    /** Retourne l'enseignant dont l'id est le plus grand en ordre lexicographique
     *  (ex: "E00099" > "E00010"), utilisé pour l'auto-incrément de l'identifiant. */
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
}
