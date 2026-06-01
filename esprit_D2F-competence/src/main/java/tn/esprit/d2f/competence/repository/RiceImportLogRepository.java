package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.RiceImportLog;

import java.util.List;

@Repository
public interface RiceImportLogRepository extends JpaRepository<RiceImportLog, Long> {

    List<RiceImportLog> findAllByOrderByGeneratedAtDesc();
}
