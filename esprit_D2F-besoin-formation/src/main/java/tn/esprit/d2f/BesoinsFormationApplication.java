package tn.esprit.d2f;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"tn.esprit.d2f", "esprit.pfe.auth.security"})
@EnableScheduling
public class BesoinsFormationApplication {

	public static void main(String[] args) {
		SpringApplication.run(BesoinsFormationApplication.class, args);
	}

}
