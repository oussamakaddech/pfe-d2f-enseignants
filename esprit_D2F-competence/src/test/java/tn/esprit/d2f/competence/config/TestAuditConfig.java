package tn.esprit.d2f.competence.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

/**
 * Configuration JPA Auditing pour les tests en slice (@DataJpaTest).
 *
 * @DataJpaTest ne charge pas le contexte complet, donc @EnableJpaAuditing
 * défini sur CompetenceServiceApplication n'est pas chargé automatiquement.
 * On importe cette classe dans les tests @DataJpaTest.
 *
 * Fournit également un bean AuditorAware minimal ("test-user") pour que
 * les champs createdBy / updatedBy soient renseignés sans contexte de sécurité.
 *
 * Usage : @Import(TestAuditConfig.class)
 */
@TestConfiguration
public class TestAuditConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> Optional.of("test-user");
    }
}
