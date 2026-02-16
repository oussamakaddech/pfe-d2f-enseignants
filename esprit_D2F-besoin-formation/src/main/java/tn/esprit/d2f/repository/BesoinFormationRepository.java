package tn.esprit.d2f.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.BesoinFormation;

import java.util.List;

@Repository
public interface BesoinFormationRepository extends JpaRepository<BesoinFormation,Long> {

    List<BesoinFormation> findByApprouveAdminTrue();
}
