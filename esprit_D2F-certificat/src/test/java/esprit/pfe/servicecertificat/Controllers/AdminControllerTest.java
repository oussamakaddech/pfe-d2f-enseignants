package esprit.pfe.servicecertificat.controllers;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminController - Tests unitaires")
class AdminControllerTest {

    private MockMvc mockMvc;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private AdminController adminController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminController).build();
    }

    @Test
    @DisplayName("viewDlqMessages - devrait retourner la liste des messages")
    void viewDlqMessages() throws Exception {
        Message msg1 = mock(Message.class);
        when(msg1.getBody()).thenReturn("Message 1".getBytes());
        
        Message msg2 = mock(Message.class);
        when(msg2.getBody()).thenReturn("Message 2".getBytes());

        when(rabbitTemplate.receive("my.dlq"))
                .thenReturn(msg1)
                .thenReturn(msg2)
                .thenReturn(null);

        mockMvc.perform(get("/api/v1/admin/dlq/my.dlq"))
                .andExpect(status().isOk())
                .andExpect(content().json("[\"Message 1\", \"Message 2\"]"));

        verify(rabbitTemplate, times(3)).receive("my.dlq");
        verify(rabbitTemplate, times(1)).send("my.dlq", msg1);
        verify(rabbitTemplate, times(1)).send("my.dlq", msg2);
    }

    @Test
    @DisplayName("viewDlqMessages - devrait retourner une liste vide si aucun message")
    void viewDlqMessages_Empty() throws Exception {
        when(rabbitTemplate.receive("my.dlq")).thenReturn(null);

        mockMvc.perform(get("/api/v1/admin/dlq/my.dlq"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(rabbitTemplate, never()).send(anyString(), any(Message.class));
    }

    @Test
    @DisplayName("requeueDlqMessages - devrait republier les messages")
    void requeueDlqMessages() throws Exception {
        Message msg1 = mock(Message.class);
        Message msg2 = mock(Message.class);

        when(rabbitTemplate.receive("myQueue.dlq"))
                .thenReturn(msg1)
                .thenReturn(msg2)
                .thenReturn(null);

        mockMvc.perform(post("/api/v1/admin/dlq/myQueue.dlq/requeue"))
                .andExpect(status().isOk())
                .andExpect(content().string("Re-published 2 messages from myQueue.dlq to myQueue"));

        verify(rabbitTemplate, times(3)).receive("myQueue.dlq");
        verify(rabbitTemplate, times(1)).send("myQueue", msg1);
        verify(rabbitTemplate, times(1)).send("myQueue", msg2);
    }

    @Test
    @DisplayName("requeueDlqMessages - devrait retourner 0 si aucun message")
    void requeueDlqMessages_Empty() throws Exception {
        when(rabbitTemplate.receive("myQueue.dlq")).thenReturn(null);

        mockMvc.perform(post("/api/v1/admin/dlq/myQueue.dlq/requeue"))
                .andExpect(status().isOk())
                .andExpect(content().string("Re-published 0 messages from myQueue.dlq to myQueue"));

        verify(rabbitTemplate, never()).send(anyString(), any(Message.class));
    }
}
