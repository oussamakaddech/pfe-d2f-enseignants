package esprit.pfe.servicecertificat.outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
    "jwt.secret=test-secret-key-for-testing-purposes-only-must-be-at-least-512-bits",
    "spring.rabbitmq.host=localhost"
})
@DisplayName("JmsConfig - Tests d'intégration")
class JmsConfigTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("jacksonJmsMessageConverter doit être un Jackson2JsonMessageConverter")
    void converterIsJacksonType() {
        JmsConfig jmsConfig = new JmsConfig();
        MessageConverter converter = jmsConfig.jacksonJmsMessageConverter(objectMapper);

        assertThat(converter).isInstanceOf(Jackson2JsonMessageConverter.class);
    }

    @Test
    @DisplayName("ObjectMapper doit être disponible dans le contexte")
    void objectMapperAvailable() {
        assertThat(objectMapper).isNotNull();
    }

    @Test
    @DisplayName("CertificateBatchMessage doit être sérialisable")
    void certificateBatchMessageSerializable() throws Exception {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setTitreFormation("Test Formation");

        String json = objectMapper.writeValueAsString(msg);
        assertThat(json).contains("Test Formation")
                .contains("1");

        CertificateBatchMessage deserialized = objectMapper.readValue(json, CertificateBatchMessage.class);
        assertThat(deserialized.getFormationId()).isEqualTo(1L);
        assertThat(deserialized.getTitreFormation()).isEqualTo("Test Formation");
    }

    @Test
    @DisplayName("EnseignantPresenceInfo imbriqué doit être sérialisable")
    void nestedEnseignantInfoSerializable() throws Exception {
        CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
        info.setEnseignantId("E001");
        info.setNom("Test");
        info.setPrenom("User");
        info.setMail("test@esprit.tn");
        info.setRole("ANIMATEUR");
        info.setDeptEnseignantLibelle("INFO");
        info.setPresent(true);

        String json = objectMapper.writeValueAsString(info);
        assertThat(json).contains("E001")
                .contains("ANIMATEUR");

        CertificateBatchMessage.EnseignantPresenceInfo deserialized = objectMapper.readValue(json, CertificateBatchMessage.EnseignantPresenceInfo.class);
        assertThat(deserialized.getEnseignantId()).isEqualTo("E001");
        assertThat(deserialized.isPresent()).isTrue();
    }
}