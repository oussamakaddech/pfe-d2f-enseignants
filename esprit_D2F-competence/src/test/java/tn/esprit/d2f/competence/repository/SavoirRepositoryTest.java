package tn.esprit.d2f.competence.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.d2f.competence.config.TestAuditConfig;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests @DataJpaTest pour {@link SavoirRepository}.
 *
 * <p>Régression : {@code findIdsByDomaineId} et {@code searchByDomaineIdAndKeyword}
 * utilisaient un OR sur navigations implicites (INNER JOIN) qui excluait les
 * savoirs dont l'autre parent est NULL – ex. domaine sans sous-compétences avec
 * savoirs directs uniquement (cas du domaine 6) : la liste renvoyée était vide,
 * le nettoyage avant suppression du domaine était incomplet et le DELETE
 * répondait 409 (violation de clé étrangère).
 */
@DataJpaTest
@Import(TestAuditConfig.class)
@TestPropertySource(locations = "classpath:application.properties")
@DisplayName("SavoirRepository – Tests @DataJpaTest")
class SavoirRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private SavoirRepository savoirRepo;

    private Long domaineDirectId; // savoirs directs uniquement (cas domaine 6)
    private Long domaineMixteId;  // savoir direct + savoir via sous-compétence

    @BeforeEach
    void setUp() {
        // Domaine avec savoirs directs uniquement
        Domaine domaineDirect = em.persist(Domaine.builder()
                .code("DOM-DIRECT").nom("Domaine Direct").actif(true).build());
        domaineDirectId = domaineDirect.getId();
        Competence compDirect = em.persist(Competence.builder()
                .code("COMP-DIR").nom("Compétence directe").domaine(domaineDirect).ordre(1).build());
        em.persist(Savoir.builder()
                .code("SAV-DIR-1").nom("Béton armé").type(TypeSavoir.PRATIQUE)
                .niveau(NiveauMaitrise.N2_ELEMENTAIRE).competence(compDirect).build());
        em.persist(Savoir.builder()
                .code("SAV-DIR-2").nom("Eurocodes").type(TypeSavoir.THEORIQUE)
                .niveau(NiveauMaitrise.N3_INTERMEDIAIRE).competence(compDirect).build());

        // Domaine mixte : un savoir direct + un savoir via sous-compétence
        Domaine domaineMixte = em.persist(Domaine.builder()
                .code("DOM-MIXTE").nom("Domaine Mixte").actif(true).build());
        domaineMixteId = domaineMixte.getId();
        Competence compMixte = em.persist(Competence.builder()
                .code("COMP-MIX").nom("Compétence mixte").domaine(domaineMixte).ordre(1).build());
        SousCompetence sc = em.persist(SousCompetence.builder()
                .code("COMP-MIX.SC1").nom("Sous-comp mixte").competence(compMixte).build());
        em.persist(Savoir.builder()
                .code("SAV-MIX-DIR").nom("Savoir mixte direct").type(TypeSavoir.PRATIQUE)
                .niveau(NiveauMaitrise.N1_DEBUTANT).competence(compMixte).build());
        em.persist(Savoir.builder()
                .code("SAV-MIX-SC").nom("Savoir mixte via SC").type(TypeSavoir.THEORIQUE)
                .niveau(NiveauMaitrise.N1_DEBUTANT).sousCompetence(sc).build());

        em.flush();
    }

    @Nested
    @DisplayName("findIdsByDomaineId")
    class FindIdsByDomaineId {

        @Test
        @DisplayName("renvoie les savoirs directs d'un domaine sans sous-compétences")
        void shouldReturnDirectSavoirs() {
            List<Long> ids = savoirRepo.findIdsByDomaineId(domaineDirectId);
            assertThat(ids).hasSize(2);
        }

        @Test
        @DisplayName("renvoie les savoirs des deux chemins pour un domaine mixte")
        void shouldReturnBothPaths() {
            List<Long> ids = savoirRepo.findIdsByDomaineId(domaineMixteId);
            assertThat(ids).hasSize(2);
        }

        @Test
        @DisplayName("renvoie liste vide pour un domaine inconnu")
        void shouldReturnEmptyForUnknown() {
            assertThat(savoirRepo.findIdsByDomaineId(-999L)).isEmpty();
        }
    }

    @Nested
    @DisplayName("searchByDomaineIdAndKeyword")
    class SearchByDomaineIdAndKeyword {

        @Test
        @DisplayName("trouve un savoir direct par mot-clé")
        void shouldFindDirectSavoir() {
            List<Savoir> result = savoirRepo.searchByDomaineIdAndKeyword(domaineDirectId, "béton");
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCode()).isEqualTo("SAV-DIR-1");
        }

        @Test
        @DisplayName("trouve un savoir via sous-compétence par mot-clé")
        void shouldFindSavoirViaSousCompetence() {
            List<Savoir> result = savoirRepo.searchByDomaineIdAndKeyword(domaineMixteId, "via SC");
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCode()).isEqualTo("SAV-MIX-SC");
        }

        @Test
        @DisplayName("ne mélange pas les domaines")
        void shouldNotMixDomaines() {
            assertThat(savoirRepo.searchByDomaineIdAndKeyword(domaineMixteId, "béton")).isEmpty();
            assertThat(savoirRepo.searchByDomaineIdAndKeyword(domaineDirectId, "mixte")).isEmpty();
        }
    }
}
