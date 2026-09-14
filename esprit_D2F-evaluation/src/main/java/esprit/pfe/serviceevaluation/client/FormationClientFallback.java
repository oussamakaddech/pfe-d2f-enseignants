package esprit.pfe.serviceevaluation.client;

import org.springframework.stereotype.Component;

@Component
public class FormationClientFallback implements FormationClient {
    @Override
    public Object getFormation(Long id) {
        return false;
    }

    @Override
    public Boolean isAnimateurOfFormation(Long formationId, String enseignantId) {
        return false;
    }

    @Override
    public Boolean isParticipantOfFormation(Long formationId, String enseignantId) {
        return false;
    }
}
