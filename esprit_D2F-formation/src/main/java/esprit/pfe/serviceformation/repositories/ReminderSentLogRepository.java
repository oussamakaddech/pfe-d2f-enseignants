package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.ReminderSentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReminderSentLogRepository extends JpaRepository<ReminderSentLog, Long> {
    boolean existsBySeanceIdAndRecipientEmailAndReminderType(
            Long seanceId, String recipientEmail, String reminderType);
}
