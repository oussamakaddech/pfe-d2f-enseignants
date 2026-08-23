package tn.esprit.d2f.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration RabbitMQ du service de notifications.
 *
 * <p>Les autres microservices (formation, besoin, certificat, evaluationâ€¦)
 * publient leurs Ã©vÃ©nements mÃ©tier rÃ©els sur l'exchange fanout
 * {@code d2f.notifications} ; ce service les consomme et crÃ©e de vraies
 * notifications pour les destinataires concernÃ©s.</p>
 */
@Configuration
public class RabbitMqConfig {

    @Value("${rabbitmq.exchange.notifications:d2f.notifications}")
    private String notificationsExchange;

    @Value("${rabbitmq.queue.notifications:d2f.notifications.events}")
    private String notificationsQueue;

    @Bean
    public FanoutExchange notificationsExchange() {
        return new FanoutExchange(notificationsExchange, true, false);
    }

    @Bean
    public Queue notificationsQueue() {
        return new Queue(notificationsQueue, true);
    }

    @Bean
    public Binding notificationsBinding() {
        return BindingBuilder.bind(notificationsQueue()).to(notificationsExchange());
    }

    @Bean
    public Jackson2JsonMessageConverter rabbitMessageConverter(
            com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
