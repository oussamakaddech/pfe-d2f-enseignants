package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.exception.FormationStateException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/**
 * Formation State Machine Service
 * 
 * Enforces strict state transitions for Formation lifecycle:
 * - NOUVEAU → ENREGISTRE, PLANIFIE, ANNULE
 * - ENREGISTRE → PLANIFIE, ANNULE
 * - PLANIFIE → EN_COURS, ANNULE
 * - EN_COURS → ACHEVE, ANNULE
 * - ACHEVE → (terminal state, no transitions allowed)
 * - ANNULE → (terminal state, no transitions allowed)
 * - VISIBLE → (special state for published formations)
 */
@Service
@Slf4j
public class FormationStateMachine {
    
    private static final Map<EtatFormation, Set<EtatFormation>> ALLOWED_TRANSITIONS = Map.of(
        // Initial states
       EtatFormation.NOUVEAU, Set.of(EtatFormation.ENREGISTRE,EtatFormation.PLANIFIE,EtatFormation.ANNULE),
       EtatFormation.ENREGISTRE, Set.of(EtatFormation.PLANIFIE,EtatFormation.ANNULE),
        // Active states
       EtatFormation.PLANIFIE, Set.of(EtatFormation.EN_COURS,EtatFormation.ANNULE),
       EtatFormation.EN_COURS, Set.of(EtatFormation.ACHEVE,EtatFormation.ANNULE),
        // Terminal states - no transitions allowed
       EtatFormation.ACHEVE, Set.of(),
       EtatFormation.ANNULE, Set.of(),
        // Special state
       EtatFormation.VISIBLE, Set.of(EtatFormation.PLANIFIE,EtatFormation.ANNULE)
    );
    
    /**
     * Validates if a state transition is allowed.
     * 
     * @param currentState Current formation state
     * @param nextState Attempted next state
     * @throws FormationStateException if transition is not allowed
     */
    public void validateTransition(EtatFormation currentState,EtatFormation nextState) {
        if (currentState == null || nextState == null) {
            throw new FormationStateException("State cannot be null");
        }
        
        Set<EtatFormation> allowedStates = ALLOWED_TRANSITIONS.getOrDefault(currentState,Set.of());
        
        if (!allowedStates.contains(nextState)) {
            log.warn("Invalid state transition attempted: {} → {}. Allowed transitions: {}",
                currentState,nextState,allowedStates);
            throw new FormationStateException(currentState,nextState);
        }
        
        log.debug("Valid state transition: {} → {}",currentState,nextState);
    }
    
    /**
     * Checks if a transition is valid without throwing an exception.
     * 
     * @param currentState Current formation state
     * @param nextState Attempted next state
     * @return true if transition is allowed, false otherwise
     */
    public boolean canTransition(EtatFormation currentState,EtatFormation nextState) {
        if (currentState == null || nextState == null) {
            return false;
        }
        Set<EtatFormation> allowedStates = ALLOWED_TRANSITIONS.getOrDefault(currentState,Set.of());
        return allowedStates.contains(nextState);
    }
    
    /**
     * Gets all allowed next states from the current state.
     * 
     * @param currentState Current formation state
     * @return Set of allowed next states
     */
    public Set<EtatFormation> getAllowedTransitions(EtatFormation currentState) {
        return ALLOWED_TRANSITIONS.getOrDefault(currentState,Set.of());
    }
    
    /**
     * Checks if the given state is a terminal state (no further transitions allowed).
     * 
     * @param state The state to check
     * @return true if terminal, false otherwise
     */
    public boolean isTerminalState(EtatFormation state) {
        Set<EtatFormation> allowed = ALLOWED_TRANSITIONS.getOrDefault(state,Set.of());
        return allowed.isEmpty();
    }
    
    /**
     * Checks if a formation can be deleted based on its state.
     * Only formations in NOUVEAU or ANNULE state can be deleted.
     * 
     * @param state Current formation state
     * @return true if deletion is allowed
     */
    public boolean canDelete(EtatFormation state) {
        return state == EtatFormation.NOUVEAU || state == EtatFormation.ANNULE;
    }
}