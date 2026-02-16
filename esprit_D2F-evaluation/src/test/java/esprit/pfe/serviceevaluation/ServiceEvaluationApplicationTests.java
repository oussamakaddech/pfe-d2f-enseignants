package esprit.pfe.serviceevaluation;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootTest
@EnableDiscoveryClient
class ServiceEvaluationApplicationTests {

	public static void main(String[] args) {
		SpringApplication.run(ServiceEvaluationApplicationTests.class, args);
	}


}
