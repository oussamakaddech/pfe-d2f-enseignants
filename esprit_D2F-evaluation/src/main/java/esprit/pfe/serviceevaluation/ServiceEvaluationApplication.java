package esprit.pfe.serviceevaluation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.jms.annotation.EnableJms;

@SpringBootApplication
//@EnableDiscoveryClient
@EnableJms
public class ServiceEvaluationApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServiceEvaluationApplication.class, args);
	}

}
