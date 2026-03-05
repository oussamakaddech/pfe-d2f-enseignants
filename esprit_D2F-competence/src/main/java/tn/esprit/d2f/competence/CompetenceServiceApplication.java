package tn.esprit.d2f.competence;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = "tn.esprit.d2f.competence.entity")
@EnableJpaRepositories(basePackages = "tn.esprit.d2f.competence.repository")
@EnableJpaAuditing   // active @CreatedDate / @LastModifiedDate dans BaseAuditEntity
@EnableCaching       // active @Cacheable / @CacheEvict dans les services
public class CompetenceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CompetenceServiceApplication.class, args);
    }
}
