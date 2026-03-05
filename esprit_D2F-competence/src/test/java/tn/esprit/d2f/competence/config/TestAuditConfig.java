package tn.esprit.d2f.competence.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Configuration JPA Auditing pour les tests en slice (@DataJpaTest).
 *
 * @DataJpaTest ne charge pas le contexte complet, donc @EnableJpaAuditing
 * défini sur CompetenceServiceApplication n'est pas chargé automatiquement.
 * On importe cette classe dans les tests @DataJpaTest.
 *
 * Usage : @Import(TestAuditConfig.class)
 */
@TestConfiguration
@EnableJpaAuditing
public class TestAuditConfig {
}
