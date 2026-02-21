package tn.esprit.d2f.competence;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = "tn.esprit.d2f.competence.entity")
@EnableJpaRepositories(basePackages = "tn.esprit.d2f.competence.repository")
public class CompetenceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CompetenceServiceApplication.class, args);
    }
}
