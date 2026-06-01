package esprit.pfe.serviceevaluation.outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.lang.reflect.Method;

class RabbitMqConfigTest {

    @Test
    void testRabbitMqConfigCreation() {
        // Test that we can create an instance of RabbitMqConfig
        RabbitMqConfig rabbitMqConfig = new RabbitMqConfig();
        assertNotNull(rabbitMqConfig, "RabbitMqConfig should be instantiable");
    }

    @Test
    void testJacksonJmsMessageConverter() throws Exception {
        // Create an instance of the class under test
        RabbitMqConfig config = new RabbitMqConfig();

        // Mock ObjectMapper
        ObjectMapper objectMapper = mock(ObjectMapper.class);

        // Use reflection to invoke the method since it's package private
        Method method = RabbitMqConfig.class.getDeclaredMethod("jacksonJmsMessageConverter", ObjectMapper.class);
        method.setAccessible(true);
        Object result = method.invoke(config, objectMapper);

        assertNotNull(result);
        assertTrue(result instanceof Jackson2JsonMessageConverter,
                "Result should be an instance of Jackson2JsonMessageConverter");
    }
}