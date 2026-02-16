package esprit.pfe.serviceformation.messaging;



import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

@Component
public class CertificateEventPublisher {

    @Autowired
    private JmsTemplate jmsTemplate;

    public void sendCertificateBatchMessage(CertificateBatchMessage message) {
        // Grâce au converter Jackson, on peut envoyer direct l’objet
        jmsTemplate.convertAndSend("certificateQueue", message);
    }
}


