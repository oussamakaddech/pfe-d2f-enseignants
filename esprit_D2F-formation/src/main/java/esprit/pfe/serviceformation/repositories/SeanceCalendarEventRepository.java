package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.SeanceCalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeanceCalendarEventRepository extends JpaRepository<SeanceCalendarEvent, Long> {
    List<SeanceCalendarEvent> findBySeanceId(Long seanceId);
}
