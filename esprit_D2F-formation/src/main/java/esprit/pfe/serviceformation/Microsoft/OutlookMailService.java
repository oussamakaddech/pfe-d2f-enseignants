package esprit.pfe.serviceformation.microsoft;

import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.models.UserSendMailParameterSet;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import java.util.Collections;
import lombok.RequiredArgsConstructor;

// DSI §4/§2 — Service Azure AD conditionnel : désactivé par défaut (azure.ad.enabled=false).
@Service
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
@Slf4j
@RequiredArgsConstructor
public class OutlookMailService {
    private final MicrosoftGraphClientProvider graphProvider;

    public void sendMail(String to, String subject, String htmlContent) {
        // Validation des paramètres
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("L'adresse du destinataire est obligatoire");
        }

        log.info("Tentative d'envoi d'email à {} - Sujet : {}", to, subject);

        GraphServiceClient<Request> graphClient;
        try {
            graphClient = graphProvider.getGraphClient();
        } catch (IllegalStateException e) {
            log.error("Impossible d'initialiser le client Graph : {}", e.getMessage());
            throw new MailDeliveryException("Erreur d'authentification Azure AD : " + e.getMessage(), e);
        }

        // Création du message
        Message message = new Message();
        message.subject = subject;

        // Définition du corps de l'email en HTML
        ItemBody body = new ItemBody();
        body.contentType = BodyType.HTML;
        body.content = htmlContent;
        message.body = body;

        // Définition du destinataire
        EmailAddress emailAddress = new EmailAddress();
        emailAddress.address = to;
        Recipient recipient = new Recipient();
        recipient.emailAddress = emailAddress;
        message.toRecipients = Collections.singletonList(recipient);

        // Envoi du mail à partir de la boîte "Application.Formationdesformateurs@Esprit.tn"
        try {
            graphClient.users("Application.Formationdesformateurs@Esprit.tn")
                    .sendMail(UserSendMailParameterSet.newBuilder()
                            .withMessage(message)
                            .withSaveToSentItems(true)
                            .build())
                    .buildRequest()
                    .post();
            log.info("Email envoyé avec succès à {}", to);
        } catch (RuntimeException e) {
            log.error("Échec de l'envoi d'email à {} : {}", to, e.getMessage());
            throw new MailDeliveryException("Échec de l'envoi d'email à " + to + " : " + e.getMessage(), e);
        }
    }
}
