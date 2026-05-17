package esprit.pfe.serviceevaluation.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceevaluation.outil.RabbitMqConfig;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.support.converter.MessageConverter;

import static org.junit.jupiter.api.Assertions.*;

class RabbitMqConfigTest {

    @Test
    void testRabbitMqConfigCreation() {
        RabbitMqConfig config = new RabbitMqConfig();
        assertNotNull(config);
    }

    @Test
    void testJacksonMessageConverter() throws Exception {
        RabbitMqConfig config = new RabbitMqConfig();

        java.lang.reflect.Method method = RabbitMqConfig.class
                .getDeclaredMethod("jacksonJmsMessageConverter", ObjectMapper.class);
        method.setAccessible(true);
        Object result = method.invoke(config, new ObjectMapper());

        assertNotNull(result);
        assertTrue(result instanceof MessageConverter);
    }
}
