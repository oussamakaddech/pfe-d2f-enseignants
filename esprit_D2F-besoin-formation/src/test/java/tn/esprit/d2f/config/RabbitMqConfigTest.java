package tn.esprit.d2f.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires pour RabbitMqConfig.
 *
 * Les noms de queues/exchange sont désormais injectés via @Value (Fix 12).
 * ReflectionTestUtils.setField() injecte les valeurs par défaut de application.properties.
 */
class RabbitMqConfigTest {

    private static final String QUEUE_NAME  = "besoin-formation.approved";
    private static final String DLQ_NAME    = "besoin-formation.approved.dlq";
    private static final String DLX_NAME    = "d2f.dlx";

    private RabbitMqConfig config;

    @BeforeEach
    void setUp() {
        config = new RabbitMqConfig();
        // Injecter les @Value fields qui seraient normalement résolus par Spring
        ReflectionTestUtils.setField(config, "besoinApprouveQueue", QUEUE_NAME);
        ReflectionTestUtils.setField(config, "besoinApproveDlq",    DLQ_NAME);
        ReflectionTestUtils.setField(config, "dlxExchange",          DLX_NAME);
    }

    // ── dlxExchange ──────────────────────────────────────────────

    @Test
    void dlxExchange_returnsDirectExchangeWithCorrectName() {
        DirectExchange exchange = config.dlxExchange();
        assertThat(exchange).isNotNull();
        assertThat(exchange.getName()).isEqualTo(DLX_NAME);
    }

    // ── besoinQueue ──────────────────────────────────────────────

    @Test
    void besoinQueue_isDurableWithCorrectName() {
        Queue queue = config.besoinQueue();
        assertThat(queue).isNotNull();
        assertThat(queue.getName()).isEqualTo(QUEUE_NAME);
        assertThat(queue.isDurable()).isTrue();
    }

    @Test
    void besoinQueue_hasDeadLetterArguments() {
        Queue queue = config.besoinQueue();
        // x-max-retries supprimé (Fix 4) — seuls les arguments DLX standards sont conservés
        assertThat(queue.getArguments())
                .containsEntry("x-dead-letter-exchange", DLX_NAME)
                .containsEntry("x-dead-letter-routing-key", DLQ_NAME)
                .doesNotContainKey("x-max-retries");
    }

    // ── besoinDlq ────────────────────────────────────────────────

    @Test
    void besoinDlq_isDurableWithCorrectName() {
        Queue dlq = config.besoinDlq();
        assertThat(dlq).isNotNull();
        assertThat(dlq.getName()).isEqualTo(DLQ_NAME);
        assertThat(dlq.isDurable()).isTrue();
    }

    @Test
    void besoinDlq_hasTtlArgument() {
        Queue dlq = config.besoinDlq();
        assertThat(dlq.getArguments())
                .containsEntry("x-message-ttl", 86_400_000);
    }

    // ── besoinDlqBinding ─────────────────────────────────────────

    @Test
    void besoinDlqBinding_bindsCorrectly() {
        Binding binding = config.besoinDlqBinding();
        assertThat(binding).isNotNull();
        assertThat(binding.getExchange()).isEqualTo(DLX_NAME);
        assertThat(binding.getDestination()).isEqualTo(DLQ_NAME);
        assertThat(binding.getRoutingKey()).isEqualTo(DLQ_NAME);
    }

    // ── jacksonJmsMessageConverter ───────────────────────────────

    @Test
    void jacksonJmsMessageConverter_returnsConverterInstance() {
        Jackson2JsonMessageConverter converter = config.jacksonJmsMessageConverter(new ObjectMapper());
        assertThat(converter).isNotNull();
    }
}
