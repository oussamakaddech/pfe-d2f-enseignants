package tn.esprit.d2f.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.BesoinApprovalHistory;

import java.util.List;

@Repository
public interface BesoinApprovalHistoryRepository extends JpaRepository<BesoinApprovalHistory, Long> {

    List<BesoinApprovalHistory> findByBesoinIdOrderByCreatedAtDesc(Long besoinId);

    Page<BesoinApprovalHistory> findByBesoinIdOrderByCreatedAtDesc(Long besoinId, Pageable pageable);
}
