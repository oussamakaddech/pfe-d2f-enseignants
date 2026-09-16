package esprit.pfe.servicecertificat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
//@EnableDiscoveryClient
@EnableRabbit
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class ServiceCertificatApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServiceCertificatApplication.class, args);
	}

}
