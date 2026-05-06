package tn.esprit.d2f.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;

@Repository
public interface BesoinFormationRepository extends JpaRepository<BesoinFormation,Long> {

    Page<BesoinFormation> findByApprouveAdminTrue(Pageable pageable);

    /** Filtrage par UP (§2.2.2 — Consulter les besoins par UP) */
    Page<BesoinFormation> findByUp(String up, Pageable pageable);

    /** Filtrage par département (§2.2.2 — Consulter les besoins par département) */
    Page<BesoinFormation> findByDepartement(String departement, Pageable pageable);

    /** Filtrage par UP + département */
    Page<BesoinFormation> findByUpAndDepartement(String up, String departement, Pageable pageable);

    /** Tri par priorité (§2.2.2 — Prioriser les besoins) */
    Page<BesoinFormation> findAllByOrderByPrioriteDesc(Pageable pageable);

    /** Filtrage par priorité */
    Page<BesoinFormation> findByPriorite(Priorite priorite, Pageable pageable);
}

