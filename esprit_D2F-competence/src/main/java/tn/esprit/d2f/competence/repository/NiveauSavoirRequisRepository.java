package tn.esprit.d2f.competence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.competence.entity.NiveauSavoirRequis;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.util.List;

@Repository
public interface NiveauSavoirRequisRepository extends JpaRepository<NiveauSavoirRequis, Long> {

    List<NiveauSavoirRequis> findByCompetenceId(Long competenceId);

    List<NiveauSavoirRequis> findBySousCompetenceId(Long sousCompetenceId);

    List<NiveauSavoirRequis> findByCompetenceIdAndNiveau(Long competenceId, NiveauMaitrise niveau);

    List<NiveauSavoirRequis> findBySousCompetenceIdAndNiveau(Long sousCompetenceId, NiveauMaitrise niveau);

    boolean existsByCompetenceIdAndNiveauAndSavoirId(Long competenceId, NiveauMaitrise niveau, Long savoirId);

    boolean existsBySousCompetenceIdAndNiveauAndSavoirId(Long sousCompetenceId, NiveauMaitrise niveau, Long savoirId);

    void deleteByCompetenceId(Long competenceId);

    void deleteBySousCompetenceId(Long sousCompetenceId);
}
