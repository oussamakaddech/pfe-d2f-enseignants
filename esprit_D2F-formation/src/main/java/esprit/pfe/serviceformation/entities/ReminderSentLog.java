package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "reminder_sent_log",
    schema = "formation",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_reminder_sent",
        columnNames = {"seance_id", "recipient_email", "reminder_type"}
    )
)
public class ReminderSentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seance_id", nullable = false)
    private Long seanceId;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "reminder_type", nullable = false, length = 10)
    private String reminderType; // "J-7", "J-3", "J-1"

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    public ReminderSentLog(Long seanceId, String recipientEmail, String reminderType) {
        this.seanceId = seanceId;
        this.recipientEmail = recipientEmail;
        this.reminderType = reminderType;
        this.sentAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
