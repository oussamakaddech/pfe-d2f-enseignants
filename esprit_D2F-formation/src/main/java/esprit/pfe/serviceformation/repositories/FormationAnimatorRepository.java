package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.AssignmentStatus;
import esprit.pfe.serviceformation.entities.FormationAnimator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FormationAnimatorRepository extends JpaRepository<FormationAnimator, Long> {

    List<FormationAnimator> findByFormationIdAndStatus(Long formationId, AssignmentStatus status);

    List<FormationAnimator> findByFormationId(Long formationId);

    /** Affectation active d'une personne sur une formation (anti-doublon). */
    Optional<FormationAnimator> findFirstByFormationIdAndTeacherIdAndStatus(
            Long formationId, String teacherId, AssignmentStatus status);

    Optional<FormationAnimator> findFirstByFormationIdAndAnimateurIdAndStatus(
            Long formationId, String animateurId, AssignmentStatus status);

    /** Lead trainer actif d'une formation (unicité LEAD_TRAINER). */
    Optional<FormationAnimator> findFirstByFormationIdAndRoleAndStatus(
            Long formationId, AnimatorRole role, AssignmentStatus status);

    /** Affectations actives d'une personne (conflits horaires). */
    List<FormationAnimator> findByTeacherIdAndStatus(String teacherId, AssignmentStatus status);
}
