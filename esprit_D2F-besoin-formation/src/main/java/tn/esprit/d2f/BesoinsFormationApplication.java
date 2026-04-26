package tn.esprit.d2f;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;

import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = {"tn.esprit.d2f.entity"})
@EnableJpaRepositories(basePackages = "tn.esprit.d2f.repository")
@EnableAspectJAutoProxy
//@EnableDiscoveryClient
@EnableRabbit
public class BesoinsFormationApplication {

	public static void main(String[] args) {
		SpringApplication.run(BesoinsFormationApplication.class, args);
	}

}
