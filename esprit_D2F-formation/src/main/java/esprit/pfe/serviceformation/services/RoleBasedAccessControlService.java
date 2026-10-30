package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.exception.AccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Service pour les contrôles d'accès basés sur les rôles (Task 7).
 * Valide:
 * - FORMATION_READ (lecture des formations)
 * - PRESENCE_MARK (enregistrement de présence)
 * - EVALUATION_CREATE (création d'évaluations)
 * - CERTIFICAT_READ (lecture des certificats)
 * - CERTIFICAT_VERIFY (vérification de certificats)
 */
@Service
@RequiredArgsConstructor
public class RoleBasedAccessControlService {

    // Rôles définis dans AuthorizationMatrix
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_CUP = "CUP";
    private static final String ROLE_RESPONSABLE_DOSSIER = "RESPONSABLE_DOSSIER";
    private static final String ROLE_FORMATEUR = "FORMATEUR";
    private static final String ROLE_PARTICIPANT = "PARTICIPANT";

    /**
     * Vérifie si l'utilisateur peut lire une formation.
     * Autorisés: ADMIN, CUP, RESPONSABLE_DOSSIER, FORMATEUR, PARTICIPANT
     */
    public void assertCanReadFormation(Long trainingId) {
        CurrentUser user = getCurrentUser();
        
        if (user.roles().contains(ROLE_ADMIN) || 
            user.roles().contains(ROLE_CUP) ||
            user.roles().contains(ROLE_RESPONSABLE_DOSSIER) ||
            user.roles().contains(ROLE_FORMATEUR) ||
            user.roles().contains(ROLE_PARTICIPANT)) {
            return;
        }
        
        throw new AccessDeniedException("Accès refusé: lecture de formation non autorisée");
    }

    /**
     * Vérifie si l'utilisateur peut enregistrer une présence.
     * Autorisés: ADMIN, CUP, RESPONSABLE_DOSSIER, FORMATEUR
     */
    public void assertCanMarkPresence(Long trainingId, Long seanceId) {
        CurrentUser user = getCurrentUser();
        
        if (user.roles().contains(ROLE_ADMIN) || 
            user.roles().contains(ROLE_CUP) ||
            user.roles().contains(ROLE_RESPONSABLE_DOSSIER) ||
            user.roles().contains(ROLE_FORMATEUR)) {
            return;
        }
        
        throw new AccessDeniedException("Accès refusé: enregistrement de présence non autorisé");
    }

    /**
     * Vérifie si l'utilisateur peut créer une évaluation.
     * Autorisés: ADMIN, CUP, RESPONSABLE_DOSSIER, FORMATEUR
     */
    public void assertCanCreateEvaluation(Long trainingId) {
        CurrentUser user = getCurrentUser();
        
        if (user.roles().contains(ROLE_ADMIN) || 
            user.roles().contains(ROLE_CUP) ||
            user.roles().contains(ROLE_RESPONSABLE_DOSSIER) ||
            user.roles().contains(ROLE_FORMATEUR)) {
            return;
        }
        
        throw new AccessDeniedException("Accès refusé: création d'évaluation non autorisée");
    }

    /**
     * Vérifie si l'utilisateur peut lire un certificat.
     * Autorisés: ADMIN, CUP, RESPONSABLE_DOSSIER, FORMATEUR, PARTICIPANT (le sien)
     */
    public void assertCanReadCertificate(String certificateNumber, String participantId) {
        CurrentUser user = getCurrentUser();
        
        // Admins et responsables peuvent tout lire
        if (user.roles().contains(ROLE_ADMIN) || 
            user.roles().contains(ROLE_CUP) ||
            user.roles().contains(ROLE_RESPONSABLE_DOSSIER) ||
            user.roles().contains(ROLE_FORMATEUR)) {
            return;
        }
        
        // Les participants peuvent lire leurs propres certificats
        if (user.roles().contains(ROLE_PARTICIPANT) && user.userId().equals(participantId)) {
            return;
        }
        
        throw new AccessDeniedException("Accès refusé: lecture du certificat non autorisée");
    }

    /**
     * Vérifie si l'utilisateur peut générer des certificats.
     * Autorisés: ADMIN, CUP, RESPONSABLE_DOSSIER
     */
    public void assertCanGenerateCertificates(Long trainingId) {
        CurrentUser user = getCurrentUser();
        
        if (user.roles().contains(ROLE_ADMIN) || 
            user.roles().contains(ROLE_CUP) ||
            user.roles().contains(ROLE_RESPONSABLE_DOSSIER)) {
            return;
        }
        
        throw new AccessDeniedException("Accès refusé: génération de certificats non autorisée");
    }

    /**
     * Vérifie si l'utilisateur peut vérifier un certificat publiquement.
     * Autorisés: Tous (vérification publique)
     * Retourne le minimum d'informations (name, training title, date, duration)
     */
    public void assertCanVerifyCertificate(String certificateNumber) {
        // La vérification publique est autorisée pour tous
        // Pas de check de rôle ici
    }

    /**
     * Récupère l'utilisateur actuel depuis le contexte de sécurité.
     */
    private CurrentUser getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Utilisateur non authentifié");
        }
        
        // Créer un CurrentUser minimal avec le nom et les rôles de l'authentication
        java.util.Set<String> roles = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .collect(java.util.stream.Collectors.toSet());
        
        return new CurrentUser(
                authentication.getName(),
                authentication.getName(),
                authentication.getName() + "@example.com",
                roles
        );
    }

    /**
     * Vérifie si l'utilisateur a un rôle spécifique.
     */
    public boolean hasRole(String role) {
        CurrentUser user = getCurrentUser();
        return user.roles().contains(role);
    }

    /**
     * Retourne true si l'utilisateur est admin.
     */
    public boolean isAdmin() {
        return hasRole(ROLE_ADMIN);
    }

    /**
     * Retourne true si l'utilisateur est formateur.
     */
    public boolean isFormateur() {
        return hasRole(ROLE_FORMATEUR);
    }

    /**
     * Retourne true si l'utilisateur est participant.
     */
    public boolean isParticipant() {
        return hasRole(ROLE_PARTICIPANT);
    }
}
