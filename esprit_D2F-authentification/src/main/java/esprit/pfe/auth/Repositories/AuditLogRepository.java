package esprit.pfe.auth.Repositories;

import esprit.pfe.auth.Entities.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Audit Log Repository
 * Data access layer for audit logs
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Find all audit logs for a specific user
     */
    List<AuditLog> findByUsername(String username);

    /**
     * Find all audit logs for a specific resource
     */
    List<AuditLog> findByResource(String resource);

    /**
     * Find audit logs by action type
     */
    List<AuditLog> findByAction(String action);

    /**
     * Find audit logs by status
     */
    List<AuditLog> findByStatus(String status);

    /**
     * Find audit logs between two dates
     */
    List<AuditLog> findByTimestampBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find audit logs for a user between dates
     */
    List<AuditLog> findByUsernameAndTimestampBetween(String username, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find failed login attempts
     */
    List<AuditLog> findByActionAndStatus(String action, String status);

    /**
     * Find unauthorized access attempts
     */
    List<AuditLog> findByActionOrderByTimestampDesc(String action);
}
