package tn.esprit.d2f.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.UserCompetence;

import java.util.List;
@Repository
public interface UserCompetenceRepository extends JpaRepository<UserCompetence, Long> {
    List<UserCompetence> findByUserId(String userId);
}
