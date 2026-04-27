package tn.esprit.d2f.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;

import java.util.List;

@Repository
public interface BesoinFormationRepository extends JpaRepository<BesoinFormation,Long> {

    List<BesoinFormation> findByApprouveAdminTrue();

    /** Filtrage par UP (§2.2.2 — Consulter les besoins par UP) */
    List<BesoinFormation> findByUp(String up);

    /** Filtrage par département (§2.2.2 — Consulter les besoins par département) */
    List<BesoinFormation> findByDepartement(String departement);

    /** Filtrage par UP + département */
    List<BesoinFormation> findByUpAndDepartement(String up, String departement);

    /** Tri par priorité (§2.2.2 — Prioriser les besoins) */
    List<BesoinFormation> findAllByOrderByPrioriteDesc();

    /** Filtrage par priorité */
    List<BesoinFormation> findByPriorite(Priorite priorite);
}
