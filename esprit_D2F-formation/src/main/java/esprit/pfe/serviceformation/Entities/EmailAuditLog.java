package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "email_audit_log", schema = "formation")
public class EmailAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "formation_id", nullable = false)
    private Long formationId;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "email_type", nullable = false, length = 50)
    private String emailType;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "success", nullable = false)
    private boolean success;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public EmailAuditLog(Long formationId, String recipientEmail, String emailType, boolean success, String errorMessage) {
        this.formationId = formationId;
        this.recipientEmail = recipientEmail;
        this.emailType = emailType;
        this.sentAt = LocalDateTime.now();
        this.success = success;
        this.errorMessage = errorMessage;
    }
}
