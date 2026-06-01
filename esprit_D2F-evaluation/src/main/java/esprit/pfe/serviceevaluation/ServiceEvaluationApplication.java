package esprit.pfe.serviceevaluation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.retry.annotation.EnableRetry;

@SpringBootApplication
@EnableRabbit
@EnableScheduling
@EnableFeignClients
@EnableRetry
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class ServiceEvaluationApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServiceEvaluationApplication.class, args);
	}

}
