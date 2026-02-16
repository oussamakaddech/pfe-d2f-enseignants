package tn.esprit.d2f.config;

import org.apache.activemq.artemis.jms.client.ActiveMQQueue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration

public class JmsConfig {
    public static final String AFFECT_QUEUE = "competence.affect.queue";

    @Bean
    public ActiveMQQueue affectationQueue() {
        return  new ActiveMQQueue(AFFECT_QUEUE);
    }
}
