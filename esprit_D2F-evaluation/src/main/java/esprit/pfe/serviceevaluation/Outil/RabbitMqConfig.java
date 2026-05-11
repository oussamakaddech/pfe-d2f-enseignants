package esprit.pfe.serviceevaluation.outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceevaluation.messaging.EvaluationBatchMessage;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMqConfig {

    @Bean
    public MessageConverter jacksonJmsMessageConverter(ObjectMapper objectMapper) {
        Jackson2JsonMessageConverter conv = new Jackson2JsonMessageConverter(objectMapper);

        Map<String, Class<?>> mappings = new HashMap<>();
        mappings.put("EvaluationBatchMessage", EvaluationBatchMessage.class);
        mappings.put(
                "esprit.pfe.serviceformation.messaging.EvaluationBatchMessage",
                EvaluationBatchMessage.class
        );

            DefaultJackson2JavaTypeMapper javaTypeMapper = new DefaultJackson2JavaTypeMapper();
            javaTypeMapper.setTrustedPackages("*");
            javaTypeMapper.setIdClassMapping(mappings);
            conv.setJavaTypeMapper(javaTypeMapper);
        return conv;
    }
}
