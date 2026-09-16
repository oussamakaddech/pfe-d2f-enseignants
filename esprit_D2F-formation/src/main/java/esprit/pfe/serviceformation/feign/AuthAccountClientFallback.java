package esprit.pfe.serviceformation.feign;

import esprit.pfe.serviceformation.dto.AccountSummaryDTO;
import esprit.pfe.serviceformation.dto.AccountSummaryRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Fallback du client auth : si le service auth est indisponible, on renvoie une
 * liste vide. Les profils unifiés restent affichés (données enseignant), mais
 * sans enrichissement compte (rôle/statut) — pas d'échec dur de la page.
 */
@Slf4j
@Component
public class AuthAccountClientFallback implements AuthAccountClient {

    @Override
    public List<AccountSummaryDTO> getAccountSummaries(AccountSummaryRequest request) {
        log.warn("Service auth indisponible — enrichissement des comptes ignoré (fallback liste vide).");
        return Collections.emptyList();
    }
}
