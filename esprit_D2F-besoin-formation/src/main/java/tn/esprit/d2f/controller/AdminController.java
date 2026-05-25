package tn.esprit.d2f.controller;

import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Administration des Dead-Letter Queues RabbitMQ.
 * ACCÈS RESTREINT : ROLE_ADMIN uniquement (DSI §12 — RBAC admin).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/dlq")
@PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_DELETE)  // hasRole('ROLE_ADMIN')
@Tag(name = "Admin DLQ", description = "Gestion des Dead-Letter Queues RabbitMQ — ADMIN uniquement")
public class AdminController {

    private static final int MAX_DLQ_PEEK = 100;

    private final RabbitTemplate rabbitTemplate;

    public AdminController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Operation(
        summary = "Consulter les messages d'une DLQ",
        description = "Lit jusqu'à 100 messages de la queue spécifiée et les remet en place (peek non-destructif)."
    )
    @ApiResponse(responseCode = "200", description = "Liste des messages de la DLQ")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé à l'administrateur")
    @GetMapping("/{queueName}")
    public ResponseEntity<List<String>> viewDlqMessages(
            @Parameter(description = "Nom exact de la DLQ") @PathVariable String queueName) {
        log.info("Admin DLQ peek requested for queue: {}", queueName);
        List<String> messages = new ArrayList<>();
        List<Message> peeked = new ArrayList<>();
        Message msg;
        int remaining = MAX_DLQ_PEEK;

        while ((msg = rabbitTemplate.receive(queueName)) != null && remaining-- > 0) {
            messages.add(new String(msg.getBody(), StandardCharsets.UTF_8));
            peeked.add(msg);
        }
        // Return messages to queue (non-destructive peek)
        for (Message m : peeked) {
            rabbitTemplate.send(queueName, m);
        }
        log.info("DLQ peek: {} messages found in queue '{}'", messages.size(), queueName);
        return ResponseEntity.ok(messages);
    }

    @Operation(
        summary = "Republier les messages d'une DLQ vers la queue d'origine",
        description = "Transfère tous les messages de la DLQ vers la queue originale pour retraitement."
    )
    @ApiResponse(responseCode = "200", description = "Messages republiés avec succès")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé à l'administrateur")
    @PostMapping("/{dlqName}/requeue")
    public ResponseEntity<String> requeueDlqMessages(
            @Parameter(description = "Nom de la DLQ (doit se terminer par .dlq)") @PathVariable String dlqName) {
        String originalQueue = dlqName.replace(".dlq", "");
        int count = 0;
        Message msg;
        while ((msg = rabbitTemplate.receive(dlqName)) != null) {
            rabbitTemplate.send(originalQueue, msg);
            count++;
        }
        log.info("DLQ requeue: {} messages moved from '{}' to '{}'", count, dlqName, originalQueue);
        return ResponseEntity.ok("Re-published " + count + " messages from " + dlqName + " to " + originalQueue);
    }
}
