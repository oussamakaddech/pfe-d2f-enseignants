package esprit.pfe.auth.services;

import esprit.pfe.auth.entities.User;
import esprit.pfe.auth.payload.request.AccountSummaryQuery;
import esprit.pfe.auth.payload.request.EditProfileRequest;
import esprit.pfe.auth.payload.request.SignupRequest;
import esprit.pfe.auth.payload.request.UpdatePasswordRequest;
import esprit.pfe.auth.payload.response.AccountSummaryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AccountService {

    Page<User> listAccounts(Pageable pageable);

    /** Liste les comptes ; {@code includeDeleted=true} inclut les comptes archivés (soft-deleted). */
    Page<User> listAccounts(Pageable pageable, boolean includeDeleted);

    /**
     * Résumés de comptes (sans données sensibles) pour la page de gestion unifiée.
     * Critères optionnels combinés en ET : userIds, role, active.
     */
    List<AccountSummaryDTO> getAccountSummaries(AccountSummaryQuery query);

    /**
     * Création d'un compte par un administrateur, avec attribution explicite du
     * rôle. Réservé à ACCOUNT_CREATE (admin) — c'est le pendant sécurisé de
     * l'auto-inscription publique qui, elle, force toujours ENSEIGNANT.
     */
    User createAccount(SignupRequest request, String roleName);

    void banAccount(String userName);

    void enableAccount(String userName);

    User getPrincipal(String userName);

    String editProfile(String userName, EditProfileRequest editProfileRequest);

    String updatePassword(String userName, UpdatePasswordRequest updatePasswordRequest);
    User getPrincipalByUsername(String username);
    boolean userExistsById(String userId);
    void deleteAccount(String userId);

    /** Suppression physique définitive (hard delete) d'un compte déjà archivé (soft-deleted). */
    void permanentDeleteAccount(String userId);
    User updateAccount(String userId, EditProfileRequest editProfileRequest, String roleName);

}
