package esprit.pfe.serviceformation.microsoft;

import com.microsoft.graph.models.Attachment;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.FileAttachment;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.models.UserSendMailParameterSet;
import com.microsoft.graph.requests.AttachmentCollectionPage;
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
        sendMail(to, subject, htmlContent, true);
    }

    public void sendMail(String to, String subject, String content, boolean isHtml) {
        sendMail(to, subject, content, isHtml, null);
    }

    /**
     * Envoi avec une pièce jointe (ex. invitation .ics) par Microsoft Graph — le SMTP
     * authentifié étant désactivé côté Office 365, c'est le seul canal opérationnel.
     */
    public void sendMailWithAttachment(String to, String subject, String content, boolean isHtml,
                                       String fileName, String contentType, byte[] bytes) {
        FileAttachment attachment = new FileAttachment();
        attachment.oDataType = "#microsoft.graph.fileAttachment";
        attachment.name = fileName;
        attachment.contentType = contentType;
        attachment.contentBytes = bytes;
        sendMail(to, subject, content, isHtml, attachment);
    }

    private void sendMail(String to, String subject, String content, boolean isHtml, FileAttachment attachment) {
        // Validation des paramètres
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("L'adresse du destinataire est obligatoire");
        }

        log.info("Tentative d'envoi d'email à {} - Sujet : {} (HTML={})", to, subject, isHtml);

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

        // Définition du corps de l'email (HTML ou texte brut)
        ItemBody body = new ItemBody();
        body.contentType = isHtml ? BodyType.HTML : BodyType.TEXT;
        body.content = content;
        message.body = body;

        // Définition du destinataire
        EmailAddress emailAddress = new EmailAddress();
        emailAddress.address = to;
        Recipient recipient = new Recipient();
        recipient.emailAddress = emailAddress;
        message.toRecipients = Collections.singletonList(recipient);
        if (attachment != null) {
            message.attachments = new AttachmentCollectionPage(
                    Collections.<Attachment>singletonList(attachment), null);
        }

        // Envoi du mail à partir de la boîte "Application.Formationdesformateurs@Esprit.tn"
        try {
            executeSendMail(graphClient, "Application.Formationdesformateurs@Esprit.tn", UserSendMailParameterSet.newBuilder()
                    .withMessage(message)
                    .withSaveToSentItems(true)
                    .build());
            log.info("Email envoyé avec succès à {}", to);
        } catch (RuntimeException e) {
            log.error("Échec de l'envoi d'email à {} : {}", to, e.getMessage());
            throw new MailDeliveryException("Échec de l'envoi d'email à " + to + " : " + e.getMessage(), e);
        }
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
}
