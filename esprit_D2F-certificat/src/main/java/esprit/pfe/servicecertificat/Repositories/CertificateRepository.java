package esprit.pfe.servicecertificat.Repositories;




import esprit.pfe.servicecertificat.Entities.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    List<Certificate> findByFormationId(Long formationId);
    List<Certificate> findByMailEnseignant(String mailEnseignant);

}
