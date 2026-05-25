package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.Inscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {

    Page<Inscription> findByFormation_IdFormation(Long formationId, Pageable pageable);
    List<Inscription> findByFormation_IdFormation(Long formationId);
    Page<Inscription> findByEnseignant_Id(String enseignantId, Pageable pageable);
    List<Inscription> findByEnseignant_Id(String enseignantId);
}
