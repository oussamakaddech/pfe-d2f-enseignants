package esprit.pfe.serviceformation.messaging;



import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CertificateEventPublisher {
    private final RabbitTemplate rabbitTemplate;

    public void sendCertificateBatchMessage(CertificateBatchMessage message) {
        // Grâce au converter Jackson, on peut envoyer direct l’objet
        rabbitTemplate.convertAndSend("certificateQueue", message);
    }
}


