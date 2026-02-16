package esprit.pfe.auth.WebSocketConfig;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Controller
public class NotificationController {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/notify")
    @SendTo("/topic/notifications")
    public String sendNotification(String message) {
        // Simply return the message to be broadcast to all clients
        return message;
    }
    @PostMapping("/user/test-websocket")
    public ResponseEntity<String> sendTestMessage(@RequestBody String message) {
        messagingTemplate.convertAndSend("/topic/notifications", message);
        return ResponseEntity.ok("Message sent to WebSocket!");
    }
}
