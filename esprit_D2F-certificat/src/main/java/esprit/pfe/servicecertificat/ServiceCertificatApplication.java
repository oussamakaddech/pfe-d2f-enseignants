package esprit.pfe.servicecertificat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.jms.annotation.EnableJms;

@SpringBootApplication
//@EnableDiscoveryClient
@EnableJms
public class ServiceCertificatApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServiceCertificatApplication.class, args);
	}

}
