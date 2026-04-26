package esprit.pfe.serviceformation.messaging;



import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor

@Service


public class EvaluationPublisher {
    private final RabbitTemplate rabbitTemplate;

    public void sendCreate(EvaluationBatchMessage msg) {
        rabbitTemplate.convertAndSend("evaluation.create.queue", msg);
    }

    // nouveau :
    public void sendUpdate(EvaluationBatchMessage msg) {
        rabbitTemplate.convertAndSend("evaluation.update.queue", msg);
    }
}

