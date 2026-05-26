package esprit.pfe.serviceevaluation.client;

import org.springframework.stereotype.Component;

@Component
public class AuthClientFallback implements AuthClient {
    @Override
    public boolean enseignantExists(String id) {
        return false;
    }
}
