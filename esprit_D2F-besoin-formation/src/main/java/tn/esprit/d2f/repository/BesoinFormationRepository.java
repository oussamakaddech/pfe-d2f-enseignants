package tn.esprit.d2f.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.ApprovalStep;
import tn.esprit.d2f.entity.enumerations.BesoinStatus;
import tn.esprit.d2f.entity.enumerations.Priorite;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface BesoinFormationRepository extends JpaRepository<BesoinFormation,Long> {

    /**
     * Lecture avec verrou pessimiste (SELECT ... FOR UPDATE) pour la décision
     * d'approbation/refus (§5.9) : empêche deux valideurs de traiter le même
     * besoin simultanément (double approbation concurrente).
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BesoinFormation b WHERE b.idBesoinFormation = :id")
    Optional<BesoinFormation> findByIdForUpdate(@Param("id") Long id);

    Page<BesoinFormation> findByApprouveAdminTrue(Pageable pageable);

    /** Filtrage par username (besoins personnels) */
    Page<BesoinFormation> findByUsername(String username, Pageable pageable);

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

    // ── Workflow sécurisé : requêtes par étape / statut ─────────────────────

    /** Besoins en attente à une étape donnée (pending-approval). */
    Page<BesoinFormation> findByCurrentApprovalStep(ApprovalStep step, Pageable pageable);

    /** Besoins en attente à l'une des étapes données. */
    Page<BesoinFormation> findByCurrentApprovalStepIn(Collection<ApprovalStep> steps, Pageable pageable);

    /** Besoins en attente à une étape dans une UP (périmètre CUP). */
    Page<BesoinFormation> findByCurrentApprovalStepAndUp(ApprovalStep step, String up, Pageable pageable);

    /** Besoins en attente à une étape dans un département (périmètre chef). */
    Page<BesoinFormation> findByCurrentApprovalStepAndDepartement(
            ApprovalStep step, String departement, Pageable pageable);

    /** Besoins dans un statut donné (republication d'événements, pilotage). */
    java.util.List<BesoinFormation> findByStatusAndEventPublishedFalse(BesoinStatus status);
}

