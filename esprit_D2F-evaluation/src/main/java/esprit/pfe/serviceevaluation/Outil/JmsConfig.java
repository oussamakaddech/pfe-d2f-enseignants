package esprit.pfe.serviceevaluation.Outil;



import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceevaluation.messaging.EvaluationBatchMessage;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jms.annotation.EnableJms;
import org.springframework.jms.support.converter.MappingJackson2MessageConverter;
import org.springframework.jms.support.converter.MessageConverter;
import org.springframework.jms.support.converter.MessageType;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableJms
public class JmsConfig {

    @Bean
    public MessageConverter jacksonJmsMessageConverter(ObjectMapper objectMapper) {
        MappingJackson2MessageConverter conv = new MappingJackson2MessageConverter();
        conv.setObjectMapper(objectMapper);
        conv.setTargetType(MessageType.TEXT);
        conv.setTypeIdPropertyName("_type");

        Map<String, Class<?>> mappings = new HashMap<>();
        // Correspond au simple name utilisé dans votre service-formation
        mappings.put("EvaluationBatchMessage", EvaluationBatchMessage.class);
        // Correspond au FQCN tel qu’il est publié par service-formation
        mappings.put(
                "esprit.pfe.serviceformation.messaging.EvaluationBatchMessage",
                EvaluationBatchMessage.class
        );

        conv.setTypeIdMappings(mappings);
        return conv;
    }
}

