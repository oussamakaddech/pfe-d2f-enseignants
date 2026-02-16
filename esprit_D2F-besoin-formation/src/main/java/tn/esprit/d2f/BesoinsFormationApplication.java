package tn.esprit.d2f;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;

import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jms.annotation.EnableJms;

@SpringBootApplication
@EntityScan(basePackages = {"tn.esprit.d2f.entity"})
@EnableJpaRepositories(basePackages = "tn.esprit.d2f.repository")
@EnableAspectJAutoProxy
//@EnableDiscoveryClient
@EnableJms
public class BesoinsFormationApplication {

	public static void main(String[] args) {
		SpringApplication.run(BesoinsFormationApplication.class, args);
	}

}
