package esprit.pfe.serviceformation.Outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceformation.messaging.BesoinFormationApprovedEvent;
import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import esprit.pfe.serviceformation.messaging.EvaluationBatchMessage;
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
          MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
          converter.setObjectMapper(objectMapper);
          converter.setTargetType(MessageType.TEXT);
          converter.setTypeIdPropertyName("_type");

          Map<String, Class<?>> typeIdMappings = new HashMap<>();
          // votre mapping existant
          typeIdMappings.put("CertificateBatchMessage",
                  CertificateBatchMessage.class);

          // simple name
          typeIdMappings.put("BesoinFormationApprovedEvent",
                  BesoinFormationApprovedEvent.class);

          // **FQCN tel qu’il est envoyé par votre BesoinFormation-service**
          typeIdMappings.put(
                  "tn.esprit.d2f.DTO.BesoinFormationApprovedEvent",
                  BesoinFormationApprovedEvent.class
          );

          // mapping pour EvaluationBatchMessage
          typeIdMappings.put("EvaluationBatchMessage",
                  EvaluationBatchMessage.class);
          typeIdMappings.put(
                  "esprit.pfe.serviceformation.messaging.EvaluationBatchMessage",
                  EvaluationBatchMessage.class
          );
          converter.setTypeIdMappings(typeIdMappings);
          return converter;
     }
}
