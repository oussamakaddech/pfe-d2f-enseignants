package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.ImportLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ImportLogRepository extends JpaRepository<ImportLog, Long> {

    Optional<ImportLog> findFirstByFileHashOrderByImportedAtDesc(String fileHash);

    Page<ImportLog> findAllByOrderByImportedAtDesc(Pageable pageable);
}
