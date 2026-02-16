package esprit.pfe.serviceformation.messaging;



import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor

@Service


public class EvaluationPublisher {
    private final JmsTemplate jmsTemplate;

    public void sendCreate(EvaluationBatchMessage msg) {
        jmsTemplate.convertAndSend("evaluation.create.queue", msg);
    }

    // nouveau :
    public void sendUpdate(EvaluationBatchMessage msg) {
        jmsTemplate.convertAndSend("evaluation.update.queue", msg);
    }
}

