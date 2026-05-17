package tn.esprit.d2f.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import static org.assertj.core.api.Assertions.assertThat;

class RabbitMqConfigTest {

    private RabbitMqConfig config;

    @BeforeEach
    void setUp() {
        config = new RabbitMqConfig();
    }

    // ── Constants ────────────────────────────────────────────────

    @Test
    void constants_haveCorrectValues() {
        assertThat(RabbitMqConfig.DLX_EXCHANGE).isEqualTo("d2f.dlx");
        assertThat(RabbitMqConfig.BESOIN_FORMATION_APPROVED_DLQ).isEqualTo("besoin-formation.approved.dlq");
    }

    // ── dlxExchange ──────────────────────────────────────────────

    @Test
    void dlxExchange_returnsDirectExchangeWithCorrectName() {
        DirectExchange exchange = config.dlxExchange();
        assertThat(exchange).isNotNull();
        assertThat(exchange.getName()).isEqualTo("d2f.dlx");
    }

    // ── besoinQueue ──────────────────────────────────────────────

    @Test
    void besoinQueue_isDurableWithCorrectName() {
        Queue queue = config.besoinQueue();
        assertThat(queue).isNotNull();
        assertThat(queue.getName()).isEqualTo("besoin-formation.approved");
        assertThat(queue.isDurable()).isTrue();
    }

    @Test
    void besoinQueue_hasDeadLetterArguments() {
        Queue queue = config.besoinQueue();
        assertThat(queue.getArguments())
                .containsEntry("x-dead-letter-exchange", "d2f.dlx")
                .containsEntry("x-dead-letter-routing-key", "besoin-formation.approved.dlq")
                .containsEntry("x-max-retries", 3);
    }

    // ── besoinDlq ────────────────────────────────────────────────

    @Test
    void besoinDlq_isDurableWithCorrectName() {
        Queue dlq = config.besoinDlq();
        assertThat(dlq).isNotNull();
        assertThat(dlq.getName()).isEqualTo("besoin-formation.approved.dlq");
        assertThat(dlq.isDurable()).isTrue();
    }

    @Test
    void besoinDlq_hasTtlArgument() {
        Queue dlq = config.besoinDlq();
        assertThat(dlq.getArguments())
                .containsEntry("x-message-ttl", 86400000);
    }

    // ── besoinDlqBinding ─────────────────────────────────────────

    @Test
    void besoinDlqBinding_bindsCorrectly() {
        Binding binding = config.besoinDlqBinding();
        assertThat(binding).isNotNull();
        assertThat(binding.getExchange()).isEqualTo("d2f.dlx");
        assertThat(binding.getDestination()).isEqualTo("besoin-formation.approved.dlq");
        assertThat(binding.getRoutingKey()).isEqualTo("besoin-formation.approved.dlq");
    }

    // ── jacksonJmsMessageConverter ───────────────────────────────

    @Test
    void jacksonJmsMessageConverter_returnsConverterInstance() {
        ObjectMapper objectMapper = new ObjectMapper();
        Jackson2JsonMessageConverter converter = config.jacksonJmsMessageConverter(objectMapper);
        assertThat(converter).isNotNull();
    }
}
