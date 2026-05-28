package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.exception.FormationStateException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FormationStateMachineTest {

    private final FormationStateMachine stateMachine = new FormationStateMachine();

    @Test
    void validatesAllowedAndRejectedTransitions() {
        assertThat(stateMachine.canTransition(EtatFormation.ENREGISTRE, EtatFormation.PLANIFIE)).isTrue();
        assertThat(stateMachine.canTransition(EtatFormation.PLANIFIE, EtatFormation.ACHEVE)).isFalse();
        assertThat(stateMachine.getAllowedTransitions(EtatFormation.PLANIFIE)).containsExactlyInAnyOrder(EtatFormation.EN_COURS, EtatFormation.ANNULE);
        assertThat(stateMachine.isTerminalState(EtatFormation.ACHEVE)).isTrue();
        assertThat(stateMachine.canDelete(EtatFormation.NOUVEAU)).isTrue();
        assertThat(stateMachine.canDelete(EtatFormation.VISIBLE)).isFalse();
    }

    @Test
    void validateTransitionThrowsForNullOrForbiddenState() {
        assertThrows(FormationStateException.class, () -> stateMachine.validateTransition(null, EtatFormation.PLANIFIE));
        assertThrows(FormationStateException.class, () -> stateMachine.validateTransition(EtatFormation.PLANIFIE, EtatFormation.ACHEVE));
    }
}