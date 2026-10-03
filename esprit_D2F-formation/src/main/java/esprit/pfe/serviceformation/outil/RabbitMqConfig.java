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
    public static final String ANIMATOR_EVENTS_QUEUE = "d2f.animator.events";

    // ── DLQ names ──
    public static final String BESOIN_DLQ = "besoin-formation.approved.dlq";
    public static final String CERTIFICATE_DLQ = "certificateQueue.dlq";
    public static final String EVAL_CREATE_DLQ = "evaluation.create.queue.dlq";
    public static final String EVAL_UPDATE_DLQ = "evaluation.update.queue.dlq";
    public static final String ANALYTICS_DLQ = "d2f.analytics.trigger.dlq";
    public static final String ANIMATOR_EVENTS_DLQ = "d2f.animator.events.dlq";

    // ── Dead-letter argument keys ──
    private static final String DLX_ARG = "x-dead-letter-exchange";
    private static final String DLK_ARG = "x-dead-letter-routing-key";

    // Exchange dead-letter canonique DSI — doit être IDENTIQUE dans tous les
    // services qui déclarent une même queue (sinon PRECONDITION_FAILED 406).
    private static final String DLX_EXCHANGE = "d2f.dlx";

    // NB : ce service est PRODUCTEUR pour certificateQueue et evaluation.*.queues.
    // Il ne les déclare PAS — la déclaration appartient au service consommateur
    // (certificat / evaluation) avec ses propres arguments dead-letter.
    // Toute re-déclaration divergente ici provoquait des boucles d'erreurs
    // RabbitMQ 406 « inequivalent arg 'x-dead-letter-exchange' ».

    @Bean
    public Queue besoinQueue() {
        return QueueBuilder.durable(BESOIN_QUEUE)
                .withArgument(DLX_ARG, DLX_EXCHANGE)
                .withArgument(DLK_ARG, BESOIN_DLQ)
                .build();
    }

    @Bean
    public Queue besoinDlq() {
        return QueueBuilder.durable(BESOIN_DLQ).build();
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

    // ── Animator workflow events queue (propositions / affectations) ──
    @Bean
    public Queue animatorEventsQueue() {
        return QueueBuilder.durable(ANIMATOR_EVENTS_QUEUE)
                .withArgument(DLX_ARG, DLX_EXCHANGE)
                .withArgument(DLK_ARG, ANIMATOR_EVENTS_DLQ)
                .build();
    }

    @Bean
    public Queue animatorEventsDlq() {
        return QueueBuilder.durable(ANIMATOR_EVENTS_DLQ).build();
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
