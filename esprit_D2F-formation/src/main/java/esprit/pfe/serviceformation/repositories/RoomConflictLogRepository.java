package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.RoomConflictLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomConflictLogRepository extends JpaRepository<RoomConflictLog, Long> {

    Page<RoomConflictLog> findAllByOrderByDetectedAtDesc(Pageable pageable);

    List<RoomConflictLog> findByImportLogId(Long importLogId);
}
