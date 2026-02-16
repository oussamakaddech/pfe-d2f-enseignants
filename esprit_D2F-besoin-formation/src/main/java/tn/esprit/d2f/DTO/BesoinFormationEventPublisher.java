package tn.esprit.d2f.DTO;


import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

@Component
public class BesoinFormationEventPublisher {

    private final JmsTemplate jms;
    private static final String QUEUE = "BesoinFormationApprovedQueue";

    public BesoinFormationEventPublisher(JmsTemplate jms) {
        this.jms = jms;
    }

    public void publish(BesoinFormationApprovedEvent evt) {
        jms.convertAndSend(QUEUE, evt);
    }
}
