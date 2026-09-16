package esprit.pfe.auth.repositories;

import esprit.pfe.auth.entities.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {

    @Query(value = "SELECT * FROM auth.users WHERE id = ?1",
            nativeQuery = true)
    Optional<User> findByIdIncludingDeleted(String id);

    /** Suppression physique définitive (hard delete) d'un compte. */
    @Modifying
    @Query(value = "DELETE FROM auth.users WHERE id = ?1", nativeQuery = true)
    void deletePermanentById(String id);

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String emailAddress);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    User findByEmailAndUsername(String email, String username);

    /**
     * Liste TOUS les comptes, y compris les soft-deleted. Requête native : elle
     * n'est PAS soumise au {@code @SQLRestriction("deleted_at IS NULL")} de l'entité,
     * contrairement aux requêtes dérivées. Sert à la vue « comptes archivés » de
     * l'administration (visibilité/audit).
     */
    @Query(value = "SELECT * FROM auth.users",
            countQuery = "SELECT count(*) FROM auth.users",
            nativeQuery = true)
    Page<User> findAllIncludingDeleted(Pageable pageable);
}
