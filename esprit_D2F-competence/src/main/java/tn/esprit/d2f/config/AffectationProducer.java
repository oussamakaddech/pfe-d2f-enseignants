package tn.esprit.d2f.config;


import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;
import tn.esprit.d2f.entity.SavoirAffectationDTO;

@Component
public class AffectationProducer {

    private final JmsTemplate jmsTemplate;
    public void sendAffectation(SavoirAffectationDTO dto) {
        jmsTemplate.convertAndSend(JmsConfigSavoir.AFFECT_QUEUE, dto);
        System.out.println("📤 Affectation envoyée : " + dto);
    }

    public AffectationProducer(JmsTemplate jmsTemplate) {
        this.jmsTemplate = jmsTemplate;
    }
}

