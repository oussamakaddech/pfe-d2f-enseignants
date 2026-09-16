package tn.esprit.d2f.controller;


import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private AdminController adminController;

    private Message createMessage(String body) {
        return new Message(body.getBytes(), new MessageProperties());
    }

    // ── viewDlqMessages ──────────────────────────────────────────

    @Test
    void viewDlqMessages_returnsMessagesAndRequeues() {
        String queue = "test.dlq";
        Message msg1 = createMessage("{\"id\":1}");
        Message msg2 = createMessage("{\"id\":2}");

        when(rabbitTemplate.receive(queue))
                .thenReturn(msg1)
                .thenReturn(msg2)
                .thenReturn(null);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queue);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).containsExactly("{\"id\":1}", "{\"id\":2}");

        // Messages are re-sent back to the queue after reading
        verify(rabbitTemplate, times(2)).send(eq(queue), any(Message.class));
    }

    @Test
    void viewDlqMessages_emptyQueue_returnsEmptyList() {
        String queue = "empty.dlq";
        when(rabbitTemplate.receive(queue)).thenReturn(null);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queue);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEmpty();
        verify(rabbitTemplate, never()).send(anyString(), any(Message.class));
    }

    // ── requeueDlqMessages ───────────────────────────────────────

    @Test
    void requeueDlqMessages_movesMessagesToOriginalQueue() {
        String dlq = "besoin-formation.approved.dlq";
        String original = "besoin-formation.approved";
        Message msg1 = createMessage("m1");
        Message msg2 = createMessage("m2");

        when(rabbitTemplate.receive(dlq))
                .thenReturn(msg1)
                .thenReturn(msg2)
                .thenReturn(null);

        ResponseEntity<String> response = adminController.requeueDlqMessages(dlq);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("2").contains(dlq).contains(original);
        verify(rabbitTemplate, times(2)).send(eq(original), any(Message.class));
    }

    @Test
    void requeueDlqMessages_emptyDlq_returnsZeroCount() {
        String dlq = "some-queue.dlq";
        when(rabbitTemplate.receive(dlq)).thenReturn(null);

        ResponseEntity<String> response = adminController.requeueDlqMessages(dlq);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("0");
        verify(rabbitTemplate, never()).send(eq("some-queue"), any(Message.class));
    }

    @Test
    void constructor_setsRabbitTemplate() {
        AdminController controller = new AdminController(rabbitTemplate);
        assertThat(controller).isNotNull();
    }
}
