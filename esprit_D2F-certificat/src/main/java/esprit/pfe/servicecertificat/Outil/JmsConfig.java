package esprit.pfe.servicecertificat.Outil;



import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.servicecertificat.DTO.CertificateBatchMessage;
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

        // On dit: quand on voit "_type=CertificateBatchMessage",
        // on le mappe sur la classe com.example.servicecertificat.DTO.CertificateBatchMessage
        Map<String, Class<?>> typeIdMappings = new HashMap<>();
        typeIdMappings.put("CertificateBatchMessage", CertificateBatchMessage.class);
        converter.setTypeIdMappings(typeIdMappings);

        return converter;
    }

}

