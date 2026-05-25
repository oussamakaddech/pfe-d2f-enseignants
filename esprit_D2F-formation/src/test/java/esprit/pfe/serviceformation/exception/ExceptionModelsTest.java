package esprit.pfe.serviceformation.exception;

import esprit.pfe.serviceformation.entities.EtatFormation;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ExceptionModelsTest {

    @Test
    void formationStateExceptionExposesStatesAndErrorCode() {
        FormationStateException exception = new FormationStateException(EtatFormation.ENREGISTRE, EtatFormation.ACHEVE);

        assertThat(exception.getCurrentState()).isEqualTo(EtatFormation.ENREGISTRE);
        assertThat(exception.getAttemptedState()).isEqualTo(EtatFormation.ACHEVE);
        assertThat(exception.getErrorCode()).isEqualTo("FORMATION_INVALID_STATE_TRANSITION");
        assertThat(exception.toString()).contains("FORMATION_INVALID_STATE_TRANSITION", "ENREGISTRE", "ACHEVE");
    }

    @Test
    void inscriptionExceptionFactoryMethodsSetExpectedErrorCodes() {
        assertThat(InscriptionException.alreadyExists(12L, "E1").getErrorCode())
                .isEqualTo(InscriptionException.ALREADY_EXISTS);
        assertThat(InscriptionException.capacityExceeded(12L, 20).getErrorCode())
                .isEqualTo(InscriptionException.CAPACITY_EXCEEDED);
        assertThat(InscriptionException.closedInscription(12L).getErrorCode())
                .isEqualTo(InscriptionException.CLOSED);
        assertThat(InscriptionException.invalidState(12L, "ACHEVEE").getErrorCode())
                .isEqualTo(InscriptionException.INVALID_STATE);
    }

    @Test
    void microsoftGraphExceptionExposesServiceAndStatusCode() {
        MicrosoftGraphException exception = new MicrosoftGraphException("Outlook", "Sync failed", 503);

        assertThat(exception.getServiceName()).isEqualTo("Outlook");
        assertThat(exception.getStatusCode()).isEqualTo(503);
        assertThat(exception.getMessage()).contains("Outlook", "Sync failed", "503");
    }
}