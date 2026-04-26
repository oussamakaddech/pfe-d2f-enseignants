package esprit.pfe.serviceformation.Outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceformation.messaging.BesoinFormationApprovedEvent;
import esprit.pfe.serviceformation.messaging.CertificateBatchMessage;
import esprit.pfe.serviceformation.messaging.EvaluationBatchMessage;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class JmsConfig {

     @Bean
     public MessageConverter jacksonJmsMessageConverter(ObjectMapper objectMapper) {
                Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);

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

          DefaultJackson2JavaTypeMapper javaTypeMapper = new DefaultJackson2JavaTypeMapper();
          javaTypeMapper.setTrustedPackages("*");
          javaTypeMapper.setIdClassMapping(typeIdMappings);
          converter.setJavaTypeMapper(javaTypeMapper);
          return converter;
     }
}
