package esprit.pfe.auth.websocketconfig;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NotificationController {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/notify")
    @SendTo("/topic/notifications")
    public String sendNotification(String message) {
        return message;
    }

    @PostMapping("/user/test-websocket")
    public ResponseEntity<String> sendTestMessage(@RequestBody Map<String, String> payload) {
        String message = payload.getOrDefault("message", "test");
        messagingTemplate.convertAndSend("/topic/notifications", message);
        return ResponseEntity.ok("Message sent to WebSocket!");
    }
}
