package tn.esprit.d2f.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.Competence;

import java.util.List;

@Repository
public interface CompetenceRepository extends JpaRepository<Competence,Long> {
    List<Competence> findAllByIdCompetenceIn(List<Long> ids);

}
