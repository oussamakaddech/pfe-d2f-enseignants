package tn.esprit.d2f.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.d2f.entity.BesoinCompetence;

import java.util.List;

public interface BesoinCompetenceRepository extends JpaRepository<BesoinCompetence, Long> {
    List<BesoinCompetence> findByBesoinId(Long besoinId);
    void deleteByBesoinId(Long besoinId);
}
