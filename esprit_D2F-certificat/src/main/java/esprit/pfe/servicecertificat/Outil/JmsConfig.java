package esprit.pfe.servicecertificat.outil;



import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
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

        // On dit: quand on voit "_type=CertificateBatchMessage",
        // on le mappe sur la classe com.example.servicecertificat.dto.CertificateBatchMessage
        Map<String, Class<?>> typeIdMappings = new HashMap<>();
        typeIdMappings.put("CertificateBatchMessage", CertificateBatchMessage.class);

        DefaultJackson2JavaTypeMapper javaTypeMapper = new DefaultJackson2JavaTypeMapper();
        javaTypeMapper.setTrustedPackages("*");
        javaTypeMapper.setIdClassMapping(typeIdMappings);
        converter.setJavaTypeMapper(javaTypeMapper);

        return converter;
    }

}

