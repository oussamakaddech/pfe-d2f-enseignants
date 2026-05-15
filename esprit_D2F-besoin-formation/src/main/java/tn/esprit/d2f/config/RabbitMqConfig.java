package tn.esprit.d2f.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.core.*;
@Configuration
public class RabbitMqConfig {

    public static final String DLX_EXCHANGE = "d2f.dlx";

    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange(DLX_EXCHANGE);
    }

    @Bean
    public Queue besoinQueue() {
        return QueueBuilder.durable("besoin-formation.approved")
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "besoin-formation.approved.dlq")
                .withArgument("x-max-retries", 3)
                .build();
    }

    @Bean
    public Queue besoinDlq() {
        return QueueBuilder.durable("besoin-formation.approved.dlq")
                .withArgument("x-message-ttl", 86400000)
                .build();
    }

    @Bean
    public Binding besoinDlqBinding() {
        return BindingBuilder.bind(besoinDlq()).to(dlxExchange()).with("besoin-formation.approved.dlq");
    }

    @Bean
    public Jackson2JsonMessageConverter jacksonJmsMessageConverter(com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
