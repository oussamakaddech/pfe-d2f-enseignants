package esprit.pfe.auth.Repositories;

////import com.bezkoder.springjwt.models.User;

import esprit.pfe.auth.Entities.User;


import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String emailAddress);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);
    Optional<User> findByDiscount(String discountCode);


    public User findByEmailAndUsername(String email, String username);


}
