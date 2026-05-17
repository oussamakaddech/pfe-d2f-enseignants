package esprit.pfe.serviceevaluation.client;

import org.springframework.stereotype.Component;

@Component
public class AuthClientFallback implements AuthClient {
    @Override
    public Object getEnseignant(String id) {
        return false;
    }
}
