package tn.esprit.d2f.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@EntityScan(basePackages = {"tn.esprit.d2f.entity"})
@EnableJpaRepositories(basePackages = "tn.esprit.d2f.repository")
@EnableAspectJAutoProxy
@EnableRabbit
public class PersistenceConfig {
}
