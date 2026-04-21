package esprit.pfe.auth.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Audit Log Entity
 * Records all security-relevant events for compliance and forensics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_username", columnList = "username"),
        @Index(name = "idx_action", columnList = "action"),
        @Index(name = "idx_timestamp", columnList = "timestamp"),
        @Index(name = "idx_resource", columnList = "resource")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String action; // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, UNAUTHORIZED_ACCESS, etc.

    @Column(nullable = false)
    private String resource; // What was accessed/modified (e.g., "Formation", "User:admin")

    @Column(nullable = false)
    private String status; // SUCCESS, FAILED, DENIED

    @Column(length = 500)
    private String details; // Additional context

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    /**
     * Get human-readable action description
     */
    public String getActionDescription() {
        return switch (action) {
            case "LOGIN" -> "User logged in";
            case "LOGOUT" -> "User logged out";
            case "LOGIN_FAILED" -> "Login failed";
            case "CREATE" -> "Resource created";
            case "UPDATE" -> "Resource updated";
            case "DELETE" -> "Resource deleted";
            case "UNAUTHORIZED_ACCESS" -> "Unauthorized access attempt";
            default -> action;
        };
    }
}
