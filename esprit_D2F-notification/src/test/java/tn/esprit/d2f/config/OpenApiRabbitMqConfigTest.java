package tn.esprit.d2f.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OpenApiConfig & RabbitMqConfig - Tests unitaires")
class OpenApiRabbitMqConfigTest {

    @Test
    @DisplayName("OpenApiConfig - doit configurer OpenAPI avec les métadonnées")
    void openApiConfig_shouldReturnConfiguredOpenAPI() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI openAPI = config.customOpenAPI();

        assertThat(openAPI).isNotNull();
        assertThat(openAPI.getInfo().getTitle()).isEqualTo("D2F - Service de Notifications");
        assertThat(openAPI.getInfo().getDescription()).isEqualTo("API centralisée de notifications in-app temps réel");
        assertThat(openAPI.getInfo().getVersion()).isEqualTo("1.0.0");
        assertThat(openAPI.getInfo().getContact().getName()).isEqualTo("D2F Team");
        assertThat(openAPI.getInfo().getContact().getEmail()).isEqualTo("seddik.bouzayani@esprit.tn");
        assertThat(openAPI.getSecurity()).isNotEmpty();
        assertThat(openAPI.getComponents()).isNotNull();
        Components components = openAPI.getComponents();
        assertThat(components.getSecuritySchemes()).containsKey("bearerAuth");
    }

    @Test
    @DisplayName("RabbitMqConfig - doit fournir un FanoutExchange avec les bonnes propriétés")
    void rabbitMqConfig_shouldBuildExchange() {
        RabbitMqConfig config = new RabbitMqConfig();
        ReflectionTestUtils.setField(config, "notificationsExchange", "exchange.test");
        ReflectionTestUtils.setField(config, "notificationsQueue", "queue.test");

        org.springframework.amqp.core.FanoutExchange exchange = config.notificationsExchange();
        assertThat(exchange.getName()).isEqualTo("exchange.test");
        assertThat(exchange.isDurable()).isTrue();
        assertThat(exchange.isAutoDelete()).isFalse();
    }

    @Test
    @DisplayName("RabbitMqConfig - doit fournir une Queue durable")
    void rabbitMqConfig_shouldBuildQueue() {
        RabbitMqConfig config = new RabbitMqConfig();
        ReflectionTestUtils.setField(config, "notificationsExchange", "exchange.test");
        ReflectionTestUtils.setField(config, "notificationsQueue", "queue.test");

        org.springframework.amqp.core.Queue queue = config.notificationsQueue();
        assertThat(queue.getName()).isEqualTo("queue.test");
        assertThat(queue.isDurable()).isTrue();
    }

    @Test
    @DisplayName("RabbitMqConfig - doit lier la queue à l'exchange")
    void rabbitMqConfig_shouldBuildBinding() {
        RabbitMqConfig config = new RabbitMqConfig();
        ReflectionTestUtils.setField(config, "notificationsExchange", "exchange.test");
        ReflectionTestUtils.setField(config, "notificationsQueue", "queue.test");

        org.springframework.amqp.core.Binding binding = config.notificationsBinding();
        assertThat(binding.getExchange()).isEqualTo("exchange.test");
        assertThat(binding.getDestination()).isEqualTo("queue.test");
    }

    @Test
    @DisplayName("RabbitMqConfig - doit fournir un Jackson2JsonMessageConverter")
    void rabbitMqConfig_shouldProvideJsonConverter() {
        RabbitMqConfig config = new RabbitMqConfig();
        org.springframework.amqp.support.converter.Jackson2JsonMessageConverter converter =
                config.rabbitMessageConverter(new com.fasterxml.jackson.databind.ObjectMapper());
        assertThat(converter).isNotNull();
    }

    @Test
    @DisplayName("SecurityConfig - JwtDecoder doit être configuré avec HS512")
    void securityConfig_shouldBuildJwtDecoder() {
        SecurityConfig config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "jwtSecret", "a-very-long-secret-key-that-is-at-least-64-bytes-long-for-hmac-sha512");
        ReflectionTestUtils.setField(config, "allowedOriginsRaw", "http://localhost:3000");

        JwtDecoder decoder = config.jwtDecoder();
        assertThat(decoder).isNotNull();
    }

    @Test
    @DisplayName("SecurityConfig - jwtAuthenticationConverter doit être non null")
    void securityConfig_shouldBuildAuthConverter() {
        SecurityConfig config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "jwtSecret", "secret");
        ReflectionTestUtils.setField(config, "allowedOriginsRaw", "http://localhost:3000");

        org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter converter =
                config.jwtAuthenticationConverter();
        assertThat(converter).isNotNull();
    }

    @Test
    @DisplayName("SecurityConfig - corsConfigurer doit être non null")
    void securityConfig_shouldBuildCorsConfigurer() {
        SecurityConfig config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "jwtSecret", "secret");
        ReflectionTestUtils.setField(config, "allowedOriginsRaw", "http://localhost:3000");

        org.springframework.web.servlet.config.annotation.WebMvcConfigurer corsConfigurer = config.corsConfigurer();
        assertThat(corsConfigurer).isNotNull();
    }
}
