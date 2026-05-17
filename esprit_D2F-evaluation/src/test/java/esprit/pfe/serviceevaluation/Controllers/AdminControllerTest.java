package esprit.pfe.serviceevaluation.controllers;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminController - Tests unitaires")
class AdminControllerTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private AdminController adminController;

    private Message testMessage1;
    private Message testMessage2;

    @BeforeEach
    void setUp() {
        MessageProperties props = new MessageProperties();
        testMessage1 = new Message("Message 1".getBytes(StandardCharsets.UTF_8), props);
        testMessage2 = new Message("Message 2".getBytes(StandardCharsets.UTF_8), props);
    }

    @Test
    @DisplayName("viewDlqMessages - should return messages from queue and re-send them")
    void viewDlqMessages_WithMessages() {
        String queueName = "my.dlq";
        
        when(rabbitTemplate.receive(queueName))
                .thenReturn(testMessage1)
                .thenReturn(testMessage2)
                .thenReturn(null);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queueName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        assertEquals("Message 1", response.getBody().get(0));
        assertEquals("Message 2", response.getBody().get(1));
        
        verify(rabbitTemplate, times(3)).receive(queueName);
        verify(rabbitTemplate, times(1)).send(queueName, testMessage1);
        verify(rabbitTemplate, times(1)).send(queueName, testMessage2);
    }

    @Test
    @DisplayName("viewDlqMessages - should return empty list when queue is empty")
    void viewDlqMessages_EmptyQueue() {
        String queueName = "empty.dlq";
        
        when(rabbitTemplate.receive(queueName)).thenReturn(null);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queueName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());
        
        verify(rabbitTemplate, times(1)).receive(queueName);
        verify(rabbitTemplate, never()).send(anyString(), any(Message.class));
    }

    @Test
    @DisplayName("viewDlqMessages - should limit to 100 messages maximum")
    void viewDlqMessages_MaxMessages() {
        String queueName = "large.dlq";
        Message mockMessage = new Message("test".getBytes(StandardCharsets.UTF_8), new MessageProperties());
        
        // Setup: return 101 mock messages, but controller should stop at 100
        when(rabbitTemplate.receive(queueName))
                .thenAnswer(invocation -> mockMessage);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queueName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(100, response.getBody().size());
        verify(rabbitTemplate, times(101)).receive(queueName); // 100 + 1 for the null check
    }

    @Test
    @DisplayName("viewDlqMessages - should handle single message")
    void viewDlqMessages_SingleMessage() {
        String queueName = "single.dlq";
        
        when(rabbitTemplate.receive(queueName))
                .thenReturn(testMessage1)
                .thenReturn(null);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queueName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals("Message 1", response.getBody().get(0));
        
        verify(rabbitTemplate, times(1)).send(queueName, testMessage1);
    }

    @Test
    @DisplayName("requeueDlqMessages - should re-publish messages from DLQ to main queue")
    void requeueDlqMessages_WithMessages() {
        String dlqName = "myQueue.dlq";
        String originalQueue = "myQueue";
        
        when(rabbitTemplate.receive(dlqName))
                .thenReturn(testMessage1)
                .thenReturn(testMessage2)
                .thenReturn(null);

        ResponseEntity<String> response = adminController.requeueDlqMessages(dlqName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("Re-published 2 messages"));
        assertTrue(response.getBody().contains(dlqName));
        assertTrue(response.getBody().contains(originalQueue));
        
        verify(rabbitTemplate, times(3)).receive(dlqName);
        verify(rabbitTemplate, times(1)).send(originalQueue, testMessage1);
        verify(rabbitTemplate, times(1)).send(originalQueue, testMessage2);
    }

    @Test
    @DisplayName("requeueDlqMessages - should return 0 when DLQ is empty")
    void requeueDlqMessages_EmptyQueue() {
        String dlqName = "empty.dlq";
        
        when(rabbitTemplate.receive(dlqName)).thenReturn(null);

        ResponseEntity<String> response = adminController.requeueDlqMessages(dlqName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("Re-published 0 messages"));
        
        verify(rabbitTemplate, times(1)).receive(dlqName);
        verify(rabbitTemplate, never()).send(anyString(), any(Message.class));
    }

    @Test
    @DisplayName("requeueDlqMessages - should extract correct queue name from DLQ suffix")
    void requeueDlqMessages_QueueNameExtraction() {
        String dlqName = "evaluation.create.queue.dlq";
        String expectedQueue = "evaluation.create.queue";
        
        when(rabbitTemplate.receive(dlqName))
                .thenReturn(testMessage1)
                .thenReturn(null);

        ResponseEntity<String> response = adminController.requeueDlqMessages(dlqName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains(expectedQueue));
        
        verify(rabbitTemplate, times(1)).send(expectedQueue, testMessage1);
    }

    @Test
    @DisplayName("requeueDlqMessages - should handle single message")
    void requeueDlqMessages_SingleMessage() {
        String dlqName = "test.dlq";
        
        when(rabbitTemplate.receive(dlqName))
                .thenReturn(testMessage1)
                .thenReturn(null);

        ResponseEntity<String> response = adminController.requeueDlqMessages(dlqName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("Re-published 1 message"));
        
        verify(rabbitTemplate, times(1)).send("test", testMessage1);
    }

    @Test
    @DisplayName("viewDlqMessages - should process multiple batches of messages")
    void viewDlqMessages_MultipleBatches() {
        String queueName = "batch.dlq";
        Message msg3 = new Message("Message 3".getBytes(StandardCharsets.UTF_8), new MessageProperties());
        Message msg4 = new Message("Message 4".getBytes(StandardCharsets.UTF_8), new MessageProperties());
        
        when(rabbitTemplate.receive(queueName))
                .thenReturn(testMessage1)
                .thenReturn(testMessage2)
                .thenReturn(msg3)
                .thenReturn(msg4)
                .thenReturn(null);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queueName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(4, response.getBody().size());
        assertEquals("Message 1", response.getBody().get(0));
        assertEquals("Message 2", response.getBody().get(1));
        assertEquals("Message 3", response.getBody().get(2));
        assertEquals("Message 4", response.getBody().get(3));
        
        verify(rabbitTemplate, times(5)).receive(queueName);
        verify(rabbitTemplate, times(1)).send(queueName, testMessage1);
        verify(rabbitTemplate, times(1)).send(queueName, testMessage2);
        verify(rabbitTemplate, times(1)).send(queueName, msg3);
        verify(rabbitTemplate, times(1)).send(queueName, msg4);
    }

    @Test
    @DisplayName("requeueDlqMessages - should process multiple messages consecutively")
    void requeueDlqMessages_MultipleBatches() {
        String dlqName = "batch.dlq";
        String originalQueue = "batch";
        Message msg3 = new Message("Message 3".getBytes(StandardCharsets.UTF_8), new MessageProperties());
        
        when(rabbitTemplate.receive(dlqName))
                .thenReturn(testMessage1)
                .thenReturn(testMessage2)
                .thenReturn(msg3)
                .thenReturn(null);

        ResponseEntity<String> response = adminController.requeueDlqMessages(dlqName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("Re-published 3 messages"));
        
        verify(rabbitTemplate, times(4)).receive(dlqName);
        verify(rabbitTemplate, times(1)).send(originalQueue, testMessage1);
        verify(rabbitTemplate, times(1)).send(originalQueue, testMessage2);
        verify(rabbitTemplate, times(1)).send(originalQueue, msg3);
    }

    @Test
    @DisplayName("viewDlqMessages - should correctly decode message body")
    void viewDlqMessages_MessageBodyDecoding() {
        String queueName = "decode.dlq";
        String messageContent = "Test Message Content";
        Message message = new Message(messageContent.getBytes(StandardCharsets.UTF_8), new MessageProperties());
        
        when(rabbitTemplate.receive(queueName))
                .thenReturn(message)
                .thenReturn(null);

        ResponseEntity<List<String>> response = adminController.viewDlqMessages(queueName);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(messageContent, response.getBody().get(0));
    }

    @Test
    @DisplayName("constructor - should initialize with RabbitTemplate")
    void constructor_InitializesController() {
        AdminController controller = new AdminController(rabbitTemplate);
        assertNotNull(controller);
    }
}
