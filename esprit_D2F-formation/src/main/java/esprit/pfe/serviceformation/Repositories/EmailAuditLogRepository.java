package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.EmailAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailAuditLogRepository extends JpaRepository<EmailAuditLog, Long> {
    List<EmailAuditLog> findByFormationIdOrderBySentAtDesc(Long formationId);
}
