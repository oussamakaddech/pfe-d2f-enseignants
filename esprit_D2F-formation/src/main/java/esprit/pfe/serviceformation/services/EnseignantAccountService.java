package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AuthUserResponse;
import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.dto.EnseignantWithAccountRequest;
import esprit.pfe.serviceformation.feign.AuthAccountWriteClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Orchestration « compte + fiche enseignant » en UN SEUL appel :
 * <ol>
 *   <li>création du compte auth (Feign, JWT admin propagé) ;</li>
 *   <li>création de la fiche enseignant locale rattachée au {@code userId} ;</li>
 *   <li>compensation : si la fiche échoue, le compte tout juste créé est supprimé
 *       pour laisser l'admin réessayer proprement (pas de compte orphelin).</li>
 * </ol>
 *
 * <p>Volontairement NON {@code @Transactional} : la création du compte est un
 * appel distant non transactionnel ; la cohérence inter-services est assurée par
 * la compensation, pas par une transaction locale.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EnseignantAccountService {

    private final AuthAccountWriteClient authAccountWriteClient;
    private final EnseignantService enseignantService;

    public EnseignantDTO createEnseignantWithAccount(EnseignantWithAccountRequest request, String role,
                                                     String authorization) {
        // 1) Création du compte auth (peut lever FeignException : 409 email/username, 403…).
        //    Le JWT admin est propagé explicitement (cf. AuthAccountWriteClient).
        AuthUserResponse account = authAccountWriteClient.createAccount(authorization, request.toAccountRequest(), role);
        String userId = account != null ? account.getId() : null;
        if (userId == null || userId.isBlank()) {
            throw new IllegalStateException(
                    "Le compte a été créé mais aucun identifiant n'a été renvoyé par le service d'authentification.");
        }

        // 2) Création OU liaison de la fiche enseignant rattachée (compensation si échec).
        //    linkOrCreate : si une fiche existe déjà pour cet email, on la relie au
        //    compte plutôt que d'échouer (cas « enseignant déjà dans l'annuaire »).
        try {
            var enseignant = enseignantService.linkOrCreateEnseignant(
                    request.toEnseignantRequest(userId).toEntity());
            return enseignantService.toDTO(enseignant);
        } catch (RuntimeException ex) {
            log.error("Création de la fiche enseignant échouée pour userId={} → compensation (suppression du compte)",
                    userId, ex);
            compensateAccountDeletion(userId, authorization);
            throw ex;
        }
    }

    /** Supprime le compte créé en amont si la fiche n'a pas pu être créée. */
    private void compensateAccountDeletion(String userId, String authorization) {
        try {
            authAccountWriteClient.deleteAccount(authorization, userId);
            log.info("Compensation OK : compte {} supprimé après échec de création de la fiche.", userId);
        } catch (RuntimeException compensationEx) {
            // On ne masque pas l'erreur d'origine ; on journalise l'échec de compensation
            // (compte potentiellement orphelin → à nettoyer manuellement).
            log.error("Échec de la compensation (suppression du compte {} impossible). "
                    + "Compte potentiellement orphelin.", userId, compensationEx);
        }
    }
}
