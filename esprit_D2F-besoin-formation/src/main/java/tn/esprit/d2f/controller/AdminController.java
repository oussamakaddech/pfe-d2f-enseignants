package tn.esprit.d2f.controller;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/dlq")
public class AdminController {

    private final RabbitTemplate rabbitTemplate;

    public AdminController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @GetMapping("/{queueName}")
    public ResponseEntity<List<String>> viewDlqMessages(@PathVariable String queueName) {
        List<String> messages = new ArrayList<>();
        Message msg;
        int max = 100;
        List<Message> temps = new ArrayList<>();
        while ((msg = rabbitTemplate.receive(queueName)) != null && max > 0) {
            messages.add(new String(msg.getBody()));
            temps.add(msg);
            max--;
        }
        for (Message m : temps) {
            rabbitTemplate.send(queueName, m);
        }
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/{dlqName}/requeue")
    public ResponseEntity<String> requeueDlqMessages(@PathVariable String dlqName) {
        String originalQueue = dlqName.replace(".dlq", "");
        int count = 0;
        Message msg;
        while ((msg = rabbitTemplate.receive(dlqName)) != null) {
            rabbitTemplate.send(originalQueue, msg);
            count++;
        }
        return ResponseEntity.ok("Re-published " + count + " messages from " + dlqName + " to " + originalQueue);
    }
}
