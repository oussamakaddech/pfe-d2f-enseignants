package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.EtatInscription;
import esprit.pfe.serviceformation.entities.Inscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {

    Page<Inscription> findByFormation_IdFormation(Long formationId, Pageable pageable);
    List<Inscription> findByFormation_IdFormation(Long formationId);
    Page<Inscription> findByEnseignant_Id(String enseignantId, Pageable pageable);
    List<Inscription> findByEnseignant_Id(String enseignantId);

    boolean existsByFormation_IdFormationAndEnseignant_IdAndEtat(Long formationId, String enseignantId, EtatInscription etat);

    // Variante id-ou-mail (parité existsAnimateurInFormation) : l'appelant
    // inter-service transmet l'identité JWT (souvent l'email).
    @Query("SELECT COUNT(i) > 0 FROM Inscription i WHERE i.formation.idFormation = :formationId "
            + "AND (i.enseignant.id = :enseignantId OR LOWER(i.enseignant.mail) = LOWER(:enseignantId)) "
            + "AND i.etat = :etat")
    boolean existsApprovedByIdOrMail(@Param("formationId") Long formationId,
            @Param("enseignantId") String enseignantId, @Param("etat") EtatInscription etat);
}
