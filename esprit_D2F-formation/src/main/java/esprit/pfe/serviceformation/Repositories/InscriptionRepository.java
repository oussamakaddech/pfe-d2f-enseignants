package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.Entities.EtatInscription;
import esprit.pfe.serviceformation.Entities.Inscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {

    //List<Inscription> findByEtat(EtatInscription etat);
    List<Inscription> findByFormation_IdFormation(Long formationId);
}
