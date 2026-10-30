package tn.esprit.d2f.service;

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
 * DSI § — Envoi e-mail via Microsoft Graph API, PARITÉ EXACTE avec le service
 * formation ({@code MicrosoftGraphClientProvider} + {@code OutlookMailService}) :
 * flow client credentials Azure AD, envoi depuis la boîte
 * {@code Application.Formationdesformateurs@Esprit.tn} (mailSender de référence
 * de la plateforme D2F). SMTP basic auth étant désactivé côté Office 365, ce
 * canal est le seul garantissant la livraison réelle — c'est celui qui est
 * déjà opérationnel pour le service formation.
 *
 * <p>Conditionnel : instancié uniquement si {@code azure.ad.enabled=true}
 * (parité formation). Sinon {@link BesoinFormationMailNotifier} retombe sur
 * le canal SMTP classique (JavaMailSender), lui-même best-effort.</p>
 */
@Service
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
public class BesoinGraphMailSender {

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

    /** Notifie le D2F via Graph (corps HTML, best-effort géré par l'appelant). */
    public void sendMail(String to, String subject, String htmlContent) {
        GraphServiceClient<Request> client = getGraphClient();
        Message message = new Message();
        message.subject = subject;
        ItemBody body = new ItemBody();
        body.contentType = BodyType.HTML;
        body.content = htmlContent;
        message.body = body;
        EmailAddress address = new EmailAddress();
        address.address = to;
        Recipient recipient = new Recipient();
        recipient.emailAddress = address;
        message.toRecipients = Collections.singletonList(recipient);
        client.users(senderMailbox)
                .sendMail(UserSendMailParameterSet.newBuilder()
                        .withMessage(message)
                        .withSaveToSentItems(true)
                        .build())
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