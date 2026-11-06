package esprit.pfe.auth.services;

import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.authentication.TokenCredentialAuthProvider;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.models.UserSendMailParameterSet;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Envoi e-mail via Microsoft Graph API, PARITÉ EXACTE avec le service
 * formation ({@code MicrosoftGraphClientProvider} + {@code OutlookMailService})
 * et le service besoin-formation ({@code BesoinGraphMailSender}) : flow client
 * credentials Azure AD, envoi depuis la boîte
 * {@code Application.Formationdesformateurs@Esprit.tn}. SMTP basic auth étant
 * désactivé côté Office 365 (erreur 535 constatée sur /forgot-password), ce
 * canal est le seul garantissant la livraison réelle.
 *
 * <p>Conditionnel : instancié uniquement si {@code azure.ad.enabled=true}.
 * Sinon {@link EmailServiceImpl} retombe sur le canal SMTP classique
 * (JavaMailSender).</p>
 */
@Service
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
public class AuthGraphMailSender {

    @Value("${azure.ad.client-id}")
    private String clientId;

    @Value("${azure.ad.client-secret}")
    private String clientSecret;

    @Value("${azure.ad.tenant-id}")
    private String tenantId;

    @Value("${azure.ad.graph-scope:https://graph.microsoft.com/.default}")
    private String graphScope;

    /** Boîte d'envoi (parité OutlookMailService → Application.Formationdesformateurs). */
    @Value("${azure.ad.mail-username:Application.Formationdesformateurs@Esprit.tn}")
    private String senderMailbox;

    private final AtomicReference<GraphServiceClient<Request>> cachedClient = new AtomicReference<>();

    /** Envoie un e-mail texte via Graph (corps TEXT, parité SimpleMailMessage). */
    public void sendMail(String to, String subject, String textContent) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("L'adresse du destinataire est obligatoire");
        }
        GraphServiceClient<Request> client = getGraphClient();
        Message message = new Message();
        message.subject = subject;
        ItemBody body = new ItemBody();
        body.contentType = BodyType.TEXT;
        body.content = textContent;
        message.body = body;
        EmailAddress address = new EmailAddress();
        address.address = to;
        Recipient recipient = new Recipient();
        recipient.emailAddress = address;
        message.toRecipients = Collections.singletonList(recipient);
        executeSendMail(client, senderMailbox, UserSendMailParameterSet.newBuilder()
                .withMessage(message)
                .withSaveToSentItems(true)
                .build());
    }

    /**
     * Execute the Graph API sendMail call. Protected to allow test subclasses or spies to override.
     */
    protected void executeSendMail(GraphServiceClient<Request> client, String userId, UserSendMailParameterSet params) {
        client.users(userId)
                .sendMail(params)
                .buildRequest()
                .post();
    }

    /** Client Graph mis en cache (parité MicrosoftGraphClientProvider). */
    private GraphServiceClient<Request> getGraphClient() {
        GraphServiceClient<Request> client = cachedClient.get();
        if (client == null) {
            client = buildGraphClient();
            if (!cachedClient.compareAndSet(null, client)) {
                client = cachedClient.get();
            }
        }
        return client;
    }

    private GraphServiceClient<Request> buildGraphClient() {
        ClientSecretCredential credential = new ClientSecretCredentialBuilder()
                .clientId(clientId)
                .clientSecret(clientSecret)
                .tenantId(tenantId)
                .build();
        TokenCredentialAuthProvider authProvider = new TokenCredentialAuthProvider(
                Collections.singletonList(graphScope), credential);
        return GraphServiceClient.builder()
                .authenticationProvider(authProvider)
                .buildClient();
    }
}
