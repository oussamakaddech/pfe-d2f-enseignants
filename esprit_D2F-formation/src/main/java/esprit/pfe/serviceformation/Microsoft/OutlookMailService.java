package esprit.pfe.serviceformation.Microsoft;

import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.models.UserSendMailParameterSet;
import com.microsoft.graph.requests.GraphServiceClient;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class OutlookMailService {

    @Autowired
    private MicrosoftGraphClientProvider graphProvider;

    public void sendMail(String to, String subject, String htmlContent) {
        GraphServiceClient<Request> graphClient = graphProvider.getGraphClient();

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
        graphClient.users("Application.Formationdesformateurs@Esprit.tn")
                .sendMail(UserSendMailParameterSet.newBuilder()
                        .withMessage(message)
                        .withSaveToSentItems(true)
                        .build())
                .buildRequest()
                .post();
    }
}
