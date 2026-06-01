package tn.esprit.d2f.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration RabbitMQ du service besoin-formation.
 *
 * <p>Fix 12 — Toutes les valeurs sont externalisées via {@code application.properties}
 * (plus de constantes hardcodées dans le code).</p>
 *
 * <p>Architecture de la queue :</p>
 * <pre>
 *   Publisher → besoin-formation.approved (queue principale)
 *                        │ (en cas d'échec)
 *                        └─► d2f.dlx (exchange DLX)
 *                                   │
 *                                   └─► besoin-formation.approved.dlq (DLQ, TTL=24h)
 * </pre>
 */
@Configuration
public class RabbitMqConfig {

    @Value("${rabbitmq.queue.besoin-approuve:besoin-formation.approved}")
    private String besoinApprouveQueue;

    @Value("${rabbitmq.queue.besoin-approuve-dlq:besoin-formation.approved.dlq}")
    private String besoinApproveDlq;

    @Value("${rabbitmq.exchange.dlx:d2f.dlx}")
    private String dlxExchange;

    /** DLQ TTL : 24 h en ms (messages en erreur conservés 1 journée). */
    private static final int DLQ_MESSAGE_TTL_MS = 86_400_000;

    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange(dlxExchange);
    }

    @Bean
    public Queue besoinQueue() {
        return QueueBuilder.durable(besoinApprouveQueue)
                .withArgument("x-dead-letter-exchange", dlxExchange)
                .withArgument("x-dead-letter-routing-key", besoinApproveDlq)
                .build();
    }

    @Bean
    public Queue besoinDlq() {
        return QueueBuilder.durable(besoinApproveDlq)
                .withArgument("x-message-ttl", DLQ_MESSAGE_TTL_MS)
                .build();
    }

    @Bean
    public Binding besoinDlqBinding() {
        return BindingBuilder.bind(besoinDlq()).to(dlxExchange()).with(besoinApproveDlq);
    }

    /** Convertisseur JSON partagé — tous les messages AMQP sont sérialisés en JSON. */
    @Bean
    public Jackson2JsonMessageConverter jacksonJmsMessageConverter(
            com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
