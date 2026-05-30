package esprit.pfe.serviceformation.feign;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import java.util.List;

import org.junit.jupiter.api.Test;

import esprit.pfe.serviceformation.dto.EvaluationFormateurDTO;

/**
 * Blocker DSI #11 : le repli ne doit jamais propager d'exception — il dégrade
 * gracieusement quand le service d'évaluation est indisponible.
 */
class EvaluationClientFallbackTest {

    private final EvaluationClientFallback fallback = new EvaluationClientFallback();

    @Test
    void fallback_withNullList_doesNotThrow() {
        assertDoesNotThrow(() -> fallback.createEvaluationsBulk(null));
    }

    @Test
    void fallback_withItems_doesNotThrow() {
        assertDoesNotThrow(() -> fallback.createEvaluationsBulk(List.of(new EvaluationFormateurDTO())));
    }
}
