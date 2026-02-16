package tn.esprit.d2f.config;

import org.apache.activemq.artemis.jms.client.ActiveMQQueue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JmsConfigSavoir {
    public static final String AFFECT_QUEUE = "savoir.affect.queue";

    @Bean
    public ActiveMQQueue affectationQueueSavoir() {
        return  new ActiveMQQueue(AFFECT_QUEUE);
    }
}
