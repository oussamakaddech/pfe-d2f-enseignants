package esprit.pfe.serviceformation.messaging;



import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class CertificateEventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void sendCertificateBatchMessage(CertificateBatchMessage message) {
        // Grâce au converter Jackson, on peut envoyer direct l’objet
        rabbitTemplate.convertAndSend("certificateQueue", message);
    }
}


