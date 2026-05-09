package tn.esprit.d2f.dto;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import static org.mockito.Mockito.*;

class BesoinFormationEventPublisherTest {

    @Test
    void testPublish() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        BesoinFormationEventPublisher publisher = new BesoinFormationEventPublisher(rabbitTemplate);
        
        BesoinFormationApprovedEvent event = new BesoinFormationApprovedEvent();
        publisher.publish(event);
        
        verify(rabbitTemplate).convertAndSend("BesoinFormationApprovedQueue", event);
    }
}
