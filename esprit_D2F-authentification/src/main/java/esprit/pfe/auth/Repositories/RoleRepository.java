package esprit.pfe.auth.Repositories;

//////import com.bezkoder.springjwt.models.ERole;
/////////////import com.bezkoder.springjwt.models.Role;


import esprit.pfe.auth.Entities.ERole;
import esprit.pfe.auth.Entities.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
	Optional<Role> findByName(ERole name);
}
