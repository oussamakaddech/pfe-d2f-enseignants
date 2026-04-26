package esprit.pfe.serviceformation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableFeignClients
//@EnableDiscoveryClient
@EnableRabbit
public class ServiceFormationApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServiceFormationApplication.class, args);
	}

}
