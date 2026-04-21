package esprit.pfe.auth.Services;

import esprit.pfe.auth.Entities.AuditLog;
import esprit.pfe.auth.Repositories.AuditLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Audit Service
 * Logs all security-relevant actions for compliance and audit trails
 */
@Slf4j
@Service
@Transactional
public class AuditService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    /**
     * Log user login
     */
    public void logLogin(String username, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .username(username)
                .action("LOGIN")
                .resource("Authentication")
                .status("SUCCESS")
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
        log.info("User {} logged in from IP {}", username, ipAddress);
    }

    /**
     * Log failed login attempt
     */
    public void logFailedLogin(String username, String ipAddress, String reason) {
        AuditLog auditLog = AuditLog.builder()
                .username(username)
                .action("LOGIN_FAILED")
                .resource("Authentication")
                .status("FAILED")
                .details(reason)
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
        log.warn("Failed login attempt for user {} from IP {} - Reason: {}", username, ipAddress, reason);
    }

    /**
     * Log user logout
     */
    public void logLogout(String username, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .username(username)
                .action("LOGOUT")
                .resource("Authentication")
                .status("SUCCESS")
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
        log.info("User {} logged out", username);
    }

    /**
     * Log account modification
     */
    public void logAccountModification(String actor, String targetUser, String action, String details) {
        AuditLog auditLog = AuditLog.builder()
                .username(actor)
                .action(action)
                .resource("User: " + targetUser)
                .status("SUCCESS")
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
        log.info("User {} performed {} on account {}: {}", actor, action, targetUser, details);
    }

    /**
     * Log unauthorized access attempt
     */
    public void logUnauthorizedAccess(String username, String resource, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .username(username)
                .action("UNAUTHORIZED_ACCESS")
                .resource(resource)
                .status("DENIED")
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
        log.warn("Unauthorized access attempt by {} to {} from IP {}", username, resource, ipAddress);
    }

    /**
     * Log CRUD operations
     */
    public void logCrudOperation(String username, String operation, String resource, String resourceId, String details) {
        AuditLog auditLog = AuditLog.builder()
                .username(username)
                .action(operation.toUpperCase())
                .resource(resource + " (ID: " + resourceId + ")")
                .status("SUCCESS")
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
        log.info("User {} performed {} on {} with ID {}: {}", username, operation, resource, resourceId, details);
    }

    /**
     * Get audit logs for a user
     */
    public List<AuditLog> getUserAuditLogs(String username) {
        return auditLogRepository.findByUsername(username);
    }

    /**
     * Get audit logs for a resource
     */
    public List<AuditLog> getResourceAuditLogs(String resource) {
        return auditLogRepository.findByResource(resource);
    }

    /**
     * Get all audit logs (admin only)
     */
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAll();
    }

    /**
     * Get audit logs between dates
     */
    public List<AuditLog> getAuditLogsBetweenDates(LocalDateTime startDate, LocalDateTime endDate) {
        return auditLogRepository.findByTimestampBetween(startDate, endDate);
    }
}
