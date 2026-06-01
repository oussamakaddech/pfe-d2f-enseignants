package tn.esprit.d2f.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import static org.junit.jupiter.api.Assertions.*;

class JmsConfigImprovedTest {

    @Test
    void testJacksonJmsMessageConverter() {
        RabbitMqConfig config = new RabbitMqConfig();
        ObjectMapper mapper = new ObjectMapper();
        Jackson2JsonMessageConverter converter = config.jacksonJmsMessageConverter(mapper);

        assertNotNull(converter);
    }

    @Test
    void testJacksonJmsMessageConverterWithRealMapper() {
        RabbitMqConfig config = new RabbitMqConfig();
        ObjectMapper mapper = new ObjectMapper();
        Jackson2JsonMessageConverter converter = config.jacksonJmsMessageConverter(mapper);

        assertNotNull(converter);
        assertInstanceOf(Jackson2JsonMessageConverter.class, converter);
    }
}
