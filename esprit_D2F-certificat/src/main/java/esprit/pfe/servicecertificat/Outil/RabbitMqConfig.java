package esprit.pfe.servicecertificat.outil;

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
    public static final String CERTIFICATE_QUEUE_DLQ = "certificateQueue.dlq";

    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange(DLX_EXCHANGE);
    }

    @Bean
    public Queue certificateQueue() {
        return QueueBuilder.durable("certificateQueue")
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", CERTIFICATE_QUEUE_DLQ)
                .withArgument("x-max-retries", 3)
                .build();
    }

    @Bean
    public Queue certificateDlq() {
        return QueueBuilder.durable(CERTIFICATE_QUEUE_DLQ)
                .withArgument("x-message-ttl", 86400000)
                .build();
    }

    @Bean
    public Binding certificateDlqBinding() {
        return BindingBuilder.bind(certificateDlq()).to(dlxExchange()).with(CERTIFICATE_QUEUE_DLQ);
    }

    @Bean
    public MessageConverter jacksonJmsMessageConverter(ObjectMapper objectMapper) {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);

        Map<String, Class<?>> typeIdMappings = new HashMap<>();
        typeIdMappings.put("CertificateBatchMessage", esprit.pfe.servicecertificat.dto.CertificateBatchMessage.class);

        DefaultJackson2JavaTypeMapper javaTypeMapper = new DefaultJackson2JavaTypeMapper();
        javaTypeMapper.setTrustedPackages(
            "esprit.pfe.servicecertificat.dto",
            "esprit.pfe.serviceformation.messaging"
        );
        javaTypeMapper.setIdClassMapping(typeIdMappings);
        converter.setJavaTypeMapper(javaTypeMapper);

        return converter;
    }

    @Bean
    public org.springframework.amqp.rabbit.retry.MessageRecoverer messageRecoverer() {
        return new org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer() {
            @Override
            public void recover(Message message, Throwable cause) {
                org.slf4j.LoggerFactory.getLogger(RabbitMqConfig.class)
                    .error("ECHEC DEFINITIF - Le message sera routé vers la DLQ. Erreur: {}", cause.getMessage());
                super.recover(message, cause);
            }
        };
    }
}
