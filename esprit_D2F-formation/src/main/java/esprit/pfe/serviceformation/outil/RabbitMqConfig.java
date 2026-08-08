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
    // Aligné sur le publisher besoin-formation (rabbitmq.queue.besoin-approuve,
    // défaut "besoin-formation.approved") — fix audit DSI D13 : la queue
    // "BesoinFormationApprovedQueue" n'était écoutée par personne.
    public static final String BESOIN_QUEUE = "besoin-formation.approved";
    public static final String CERTIFICATE_QUEUE = "certificateQueue";
    public static final String EVAL_CREATE_QUEUE = "evaluation.create.queue";
    public static final String EVAL_UPDATE_QUEUE = "evaluation.update.queue";
    public static final String ANALYTICS_QUEUE = "d2f.analytics.trigger";

    // ── DLQ names ──
    public static final String BESOIN_DLQ = "besoin-formation.approved.dlq";
    public static final String CERTIFICATE_DLQ = "certificateQueue.dlq";
    public static final String EVAL_CREATE_DLQ = "evaluation.create.queue.dlq";
    public static final String EVAL_UPDATE_DLQ = "evaluation.update.queue.dlq";
    public static final String ANALYTICS_DLQ = "d2f.analytics.trigger.dlq";

    // ── Dead-letter argument keys ──
    private static final String DLX_ARG = "x-dead-letter-exchange";
    private static final String DLK_ARG = "x-dead-letter-routing-key";

    @Bean
    public Queue besoinQueue() {
        return QueueBuilder.durable(BESOIN_QUEUE)
                .withArgument(DLX_ARG, "")
                .withArgument(DLK_ARG, BESOIN_DLQ)
                .build();
    }

    @Bean
    public Queue besoinDlq() {
        return QueueBuilder.durable(BESOIN_DLQ).build();
    }

    @Bean
    public Queue certificateQueue() {
        return QueueBuilder.durable(CERTIFICATE_QUEUE)
                .withArgument(DLX_ARG, "")
                .withArgument(DLK_ARG, CERTIFICATE_DLQ)
                .build();
    }

    @Bean
    public Queue certificateDlq() {
        return QueueBuilder.durable(CERTIFICATE_DLQ).build();
    }

    @Bean
    public Queue evalCreateQueue() {
        return QueueBuilder.durable(EVAL_CREATE_QUEUE)
                .withArgument(DLX_ARG, "")
                .withArgument(DLK_ARG, EVAL_CREATE_DLQ)
                .build();
    }

    @Bean
    public Queue evalCreateDlq() {
        return QueueBuilder.durable(EVAL_CREATE_DLQ).build();
    }

    @Bean
    public Queue evalUpdateQueue() {
        return QueueBuilder.durable(EVAL_UPDATE_QUEUE)
                .withArgument(DLX_ARG, "")
                .withArgument(DLK_ARG, EVAL_UPDATE_DLQ)
                .build();
    }

    @Bean
    public Queue evalUpdateDlq() {
        return QueueBuilder.durable(EVAL_UPDATE_DLQ).build();
    }

    // ── Analytics queue (for predictive-analytics consumer) ──
    @Bean
    public Queue analyticsQueue() {
        return QueueBuilder.durable(ANALYTICS_QUEUE)
                .withArgument(DLX_ARG, "")
                .withArgument(DLK_ARG, ANALYTICS_DLQ)
                .build();
    }

    @Bean
    public Queue analyticsDlq() {
        return QueueBuilder.durable(ANALYTICS_DLQ).build();
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
