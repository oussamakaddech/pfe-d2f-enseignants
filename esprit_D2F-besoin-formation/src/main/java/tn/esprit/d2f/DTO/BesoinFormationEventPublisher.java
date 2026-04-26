package tn.esprit.d2f.DTO;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class BesoinFormationEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private static final String QUEUE = "BesoinFormationApprovedQueue";

    public BesoinFormationEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(BesoinFormationApprovedEvent evt) {
        rabbitTemplate.convertAndSend(QUEUE, evt);
    }
}
