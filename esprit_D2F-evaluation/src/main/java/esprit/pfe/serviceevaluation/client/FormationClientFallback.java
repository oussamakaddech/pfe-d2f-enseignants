package esprit.pfe.serviceevaluation.client;

import org.springframework.stereotype.Component;

@Component
public class FormationClientFallback implements FormationClient {
    @Override
    public Object getFormation(Long id) {
        return false;
    }
}
