package esprit.pfe.servicecertificat.repositories;

import esprit.pfe.servicecertificat.entities.Certificate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    List<Certificate> findByFormationId(Long formationId);
    Page<Certificate> findByFormationId(Long formationId, Pageable pageable);
    List<Certificate> findByMailEnseignant(String mailEnseignant);
    Page<Certificate> findByMailEnseignant(String mailEnseignant, Pageable pageable);
    List<Certificate> findByEnseignantId(String enseignantId);
    Page<Certificate> findByEnseignantId(String enseignantId, Pageable pageable);
}
