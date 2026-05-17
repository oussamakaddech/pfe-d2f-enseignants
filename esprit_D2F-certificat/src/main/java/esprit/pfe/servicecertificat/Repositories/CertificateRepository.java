package esprit.pfe.servicecertificat.repositories;




import esprit.pfe.servicecertificat.entities.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    List<Certificate> findByFormationId(Long formationId);
    List<Certificate> findByMailEnseignant(String mailEnseignant);
    List<Certificate> findByEnseignantId(String enseignantId);
}
