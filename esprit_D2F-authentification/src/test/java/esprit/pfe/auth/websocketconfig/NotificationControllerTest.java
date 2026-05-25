package esprit.pfe.auth.websocketconfig;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    // Required when @EnableJpaAuditing is enabled on the main application class.
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @SuppressWarnings("rawtypes")
    @MockitoBean(name = "auditorProvider")
    private AuditorAware auditorProvider;

    @Test
    void sendNotification_ShouldReturnMessage() {
        NotificationController controller = new NotificationController(messagingTemplate);
        String message = "Hello Test";
        String result = controller.sendNotification(message);
        assertEquals(message, result);
    }

    @Test
    void sendTestMessage_ShouldCallMessagingTemplate() throws Exception {
        String message = "REST Test Message";

        mockMvc.perform(post("/user/test-websocket")
                .contentType(MediaType.TEXT_PLAIN)
                .content(message))
                .andExpect(status().isOk());

        verify(messagingTemplate).convertAndSend("/topic/notifications", message);
    }
}
