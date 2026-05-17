package esprit.pfe.serviceevaluation.outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMqConfig {

    public static final String DLX_EXCHANGE = "d2f.dlx";
    public static final String EVAL_CREATE_QUEUE = "evaluation.create.queue";
    public static final String EVAL_CREATE_DLQ = "evaluation.create.queue.dlq";
    public static final String EVAL_UPDATE_QUEUE = "evaluation.update.queue";
    public static final String EVAL_UPDATE_DLQ = "evaluation.update.queue.dlq";

    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange(DLX_EXCHANGE);
    }

    // --- EVALUATION CREATE ---
    @Bean
    public Queue evalCreateQueue() {
        return QueueBuilder.durable(EVAL_CREATE_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", EVAL_CREATE_DLQ)
                .withArgument("x-max-retries", 3)
                .build();
    }

    @Bean
    public Queue evalCreateDlq() {
        return QueueBuilder.durable(EVAL_CREATE_DLQ)
                .withArgument("x-message-ttl", 86400000) // 24h
                .build();
    }

    @Bean
    public Binding evalCreateDlqBinding() {
        return BindingBuilder.bind(evalCreateDlq()).to(dlxExchange()).with(EVAL_CREATE_DLQ);
    }

    // --- EVALUATION UPDATE ---
    @Bean
    public Queue evalUpdateQueue() {
        return QueueBuilder.durable(EVAL_UPDATE_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", EVAL_UPDATE_DLQ)
                .withArgument("x-max-retries", 3)
                .build();
    }

    @Bean
    public Queue evalUpdateDlq() {
        return QueueBuilder.durable(EVAL_UPDATE_DLQ)
                .withArgument("x-message-ttl", 86400000)
                .build();
    }

    @Bean
    public Binding evalUpdateDlqBinding() {
        return BindingBuilder.bind(evalUpdateDlq()).to(dlxExchange()).with(EVAL_UPDATE_DLQ);
    }

    @Bean
    public MessageConverter jacksonJmsMessageConverter(ObjectMapper objectMapper) {
        Jackson2JsonMessageConverter conv = new Jackson2JsonMessageConverter(objectMapper);
        Map<String, Class<?>> mappings = new HashMap<>();
        mappings.put("EvaluationBatchMessage", esprit.pfe.serviceevaluation.messaging.EvaluationBatchMessage.class);
        mappings.put("esprit.pfe.serviceformation.messaging.EvaluationBatchMessage", esprit.pfe.serviceevaluation.messaging.EvaluationBatchMessage.class);

        DefaultJackson2JavaTypeMapper javaTypeMapper = new DefaultJackson2JavaTypeMapper();
        javaTypeMapper.setTrustedPackages("*");
        javaTypeMapper.setIdClassMapping(mappings);
        conv.setJavaTypeMapper(javaTypeMapper);
        return conv;
    }
}
