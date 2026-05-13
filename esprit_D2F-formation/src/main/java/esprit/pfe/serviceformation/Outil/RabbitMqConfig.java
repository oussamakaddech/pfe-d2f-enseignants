package esprit.pfe.serviceformation.outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceformation.messaging.BesoinFormationApprovedEvent;
import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import esprit.pfe.serviceformation.messaging.EvaluationBatchMessage;
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

    // ── Queue names ──
    public static final String BESOIN_QUEUE = "BesoinFormationApprovedQueue";
    public static final String CERTIFICATE_QUEUE = "certificateQueue";
    public static final String EVAL_CREATE_QUEUE = "evaluation.create.queue";
    public static final String EVAL_UPDATE_QUEUE = "evaluation.update.queue";

    // ── DLQ names ──
    public static final String BESOIN_DLQ = "BesoinFormationApprovedQueue.dlq";
    public static final String CERTIFICATE_DLQ = "certificateQueue.dlq";
    public static final String EVAL_CREATE_DLQ = "evaluation.create.queue.dlq";
    public static final String EVAL_UPDATE_DLQ = "evaluation.update.queue.dlq";

    @Bean
    public Queue besoinQueue() {
        return QueueBuilder.durable(BESOIN_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", BESOIN_DLQ)
                .build();
    }

    @Bean
    public Queue besoinDlq() {
        return QueueBuilder.durable(BESOIN_DLQ).build();
    }

    @Bean
    public Queue certificateQueue() {
        return QueueBuilder.durable(CERTIFICATE_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", CERTIFICATE_DLQ)
                .build();
    }

    @Bean
    public Queue certificateDlq() {
        return QueueBuilder.durable(CERTIFICATE_DLQ).build();
    }

    @Bean
    public Queue evalCreateQueue() {
        return QueueBuilder.durable(EVAL_CREATE_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", EVAL_CREATE_DLQ)
                .build();
    }

    @Bean
    public Queue evalCreateDlq() {
        return QueueBuilder.durable(EVAL_CREATE_DLQ).build();
    }

    @Bean
    public Queue evalUpdateQueue() {
        return QueueBuilder.durable(EVAL_UPDATE_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", EVAL_UPDATE_DLQ)
                .build();
    }

    @Bean
    public Queue evalUpdateDlq() {
        return QueueBuilder.durable(EVAL_UPDATE_DLQ).build();
    }

     @Bean
     public MessageConverter jacksonJmsMessageConverter(ObjectMapper objectMapper) {
                Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);

          Map<String, Class<?>> typeIdMappings = new HashMap<>();
          typeIdMappings.put("CertificateBatchMessage",
                  CertificateBatchMessage.class);
          typeIdMappings.put("BesoinFormationApprovedEvent",
                  BesoinFormationApprovedEvent.class);
          typeIdMappings.put(
                  "tn.esprit.d2f.dto.BesoinFormationApprovedEvent",
                  BesoinFormationApprovedEvent.class
          );
          typeIdMappings.put("EvaluationBatchMessage",
                  EvaluationBatchMessage.class);
          typeIdMappings.put(
                  "esprit.pfe.serviceformation.messaging.EvaluationBatchMessage",
                  EvaluationBatchMessage.class
          );

          DefaultJackson2JavaTypeMapper javaTypeMapper = new DefaultJackson2JavaTypeMapper();
          javaTypeMapper.setTrustedPackages("esprit.pfe.serviceformation.messaging", "tn.esprit.d2f.dto");
          javaTypeMapper.setIdClassMapping(typeIdMappings);
          converter.setJavaTypeMapper(javaTypeMapper);
          return converter;
     }
}
