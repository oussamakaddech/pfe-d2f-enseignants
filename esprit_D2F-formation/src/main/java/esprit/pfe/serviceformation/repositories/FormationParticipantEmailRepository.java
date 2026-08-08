package esprit.pfe.serviceformation.repositories;

import esprit.pfe.serviceformation.entities.FormationParticipantEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormationParticipantEmailRepository extends JpaRepository<FormationParticipantEmail, Long> {

    List<FormationParticipantEmail> findByFormationId(Long formationId);

    org.springframework.data.domain.Page<FormationParticipantEmail> findByFormationId(
            Long formationId, org.springframework.data.domain.Pageable pageable);

    long countByFormationId(Long formationId);

    boolean existsByFormationIdAndEmailIgnoreCase(Long formationId, String email);

    @Query("SELECT DISTINCT p.formationId FROM FormationParticipantEmail p WHERE LOWER(p.email) = LOWER(:email)")
    List<Long> findFormationIdsByEmail(@Param("email") String email);

    @Query("SELECT DISTINCT LOWER(p.email) FROM FormationParticipantEmail p WHERE p.formationId = :formationId")
    List<String> findDistinctEmailsByFormationId(@Param("formationId") Long formationId);
}
