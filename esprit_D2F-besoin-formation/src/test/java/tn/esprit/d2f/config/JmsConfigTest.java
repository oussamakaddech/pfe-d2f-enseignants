package tn.esprit.d2f.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class JmsConfigTest {

    @Test
    void testJacksonJmsMessageConverter() {
        RabbitMqConfig config = new RabbitMqConfig();
        ObjectMapper mapper = mock(ObjectMapper.class);
        Jackson2JsonMessageConverter converter = config.jacksonJmsMessageConverter(mapper);
        
        assertNotNull(converter);
    }
}
