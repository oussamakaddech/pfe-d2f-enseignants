package esprit.pfe.serviceevaluation.client;

import org.springframework.stereotype.Component;

@Component
public class FormationClientFallback implements FormationClient {
    @Override
    public Object getFormation(Long id) {
        return false;
    }

    @Override
    public Object getEnseignantById(String id) {
        return null;
    }

    @Override
    public Boolean isAnimateurOfFormation(Long formationId, String enseignantId) {
        return false;
    }

    @Override
    public Boolean isParticipantOfFormation(Long formationId, String enseignantId) {
        return false;
    }

    /** null = service formation injoignable (distinct de « non participant »). */
    @Override
    public java.util.Map<String, Object> participantInfo(Long formationId, String idOrMail) {
        return null;
    }
}
