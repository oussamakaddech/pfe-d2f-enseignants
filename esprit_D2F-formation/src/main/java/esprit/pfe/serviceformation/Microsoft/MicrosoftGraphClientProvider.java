package esprit.pfe.serviceformation.microsoft;

import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.authentication.TokenCredentialAuthProvider;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;

@Service
@Slf4j
public class MicrosoftGraphClientProvider {

    @Value("${azure.ad.client-id}")
    private String clientId;

    @Value("${azure.ad.client-secret}")
    private String clientSecret;

    @Value("${azure.ad.tenant-id}")
    private String tenantId;

    private volatile GraphServiceClient<Request> cachedGraphClient;

    public GraphServiceClient<Request> getGraphClient() {
        if (cachedGraphClient == null) {
            synchronized (this) {
                if (cachedGraphClient == null) {
                    log.info("Initialisation du GraphServiceClient Azure AD (tenant={})", tenantId);
                    ClientSecretCredential credential = new ClientSecretCredentialBuilder()
                            .clientId(clientId)
                            .clientSecret(clientSecret)
                            .tenantId(tenantId)
                            .build();

                    TokenCredentialAuthProvider authProvider = new TokenCredentialAuthProvider(
                            Collections.singletonList("https://graph.microsoft.com/.default"),
                            credential
                    );

                    cachedGraphClient = GraphServiceClient.builder()
                            .authenticationProvider(authProvider)
                            .buildClient();
                }
            }
        }
        return cachedGraphClient;
    }
}
