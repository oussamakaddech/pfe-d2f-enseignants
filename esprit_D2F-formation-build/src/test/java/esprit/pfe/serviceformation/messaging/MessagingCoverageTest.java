package esprit.pfe.serviceformation.messaging;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MessagingCoverageTest {

    @Mock private RabbitTemplate rabbitTemplate;
    @InjectMocks private CertificateEventPublisher certificateEventPublisher;
    @InjectMocks private EvaluationPublisher evaluationPublisher;

    @Test
    void testSendCertificateBatchMessage() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        certificateEventPublisher.sendCertificateBatchMessage(msg);
        verify(rabbitTemplate).convertAndSend("certificateQueue", msg);
    }

    @Test
    void testSendEvaluationCreate() {
        EvaluationBatchMessage msg = new EvaluationBatchMessage();
        evaluationPublisher.sendCreate(msg);
        verify(rabbitTemplate).convertAndSend("evaluation.create.queue", msg);
    }

    @Test
    void testSendEvaluationUpdate() {
        EvaluationBatchMessage msg = new EvaluationBatchMessage();
        evaluationPublisher.sendUpdate(msg);
        verify(rabbitTemplate).convertAndSend("evaluation.update.queue", msg);
    }
}
