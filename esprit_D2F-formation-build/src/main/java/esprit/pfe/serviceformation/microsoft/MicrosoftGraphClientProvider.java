package esprit.pfe.serviceformation.microsoft;

import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.authentication.TokenCredentialAuthProvider;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.concurrent.atomic.AtomicReference;

// DSI §4/§2 — Provider conditionnel : instancié uniquement si azure.ad.enabled=true
@Service
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
@Slf4j
public class MicrosoftGraphClientProvider {

    @Value("${azure.ad.client-id}")
    private String clientId;

    @Value("${azure.ad.client-secret}")
    private String clientSecret;

    @Value("${azure.ad.tenant-id}")
    private String tenantId;

    @Value("${azure.ad.graph-scope:https://graph.microsoft.com/.default}")
    private String graphScope;

    private final AtomicReference<GraphServiceClient<Request>> cachedGraphClient = new AtomicReference<>();

    public GraphServiceClient<Request> getGraphClient() {
        GraphServiceClient<Request> client = cachedGraphClient.get();
        if (client == null) {
            client = buildGraphClient();
            if (!cachedGraphClient.compareAndSet(null, client)) {
                client = cachedGraphClient.get();
            }
        }
        return client;
    }

    private GraphServiceClient<Request> buildGraphClient() {
        log.info("Initialisation du GraphServiceClient Azure AD (tenant={})", tenantId);
        ClientSecretCredential credential = new ClientSecretCredentialBuilder()
                .clientId(clientId)
                .clientSecret(clientSecret)
                .tenantId(tenantId)
                .build();

        TokenCredentialAuthProvider authProvider = new TokenCredentialAuthProvider(
                Collections.singletonList(graphScope),
                credential
        );

        return GraphServiceClient.builder()
                .authenticationProvider(authProvider)
                .buildClient();
    }
}
