package tn.esprit.d2f.competence.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.d2f.competence.config.TestAuditConfig;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests @DataJpaTest pour {@link CompetenceRepository}.
 *
 * <p>Vérifie :
 * <ul>
 *   <li>findAllWithDomaine – JOIN FETCH charge le domaine sans N+1</li>
 *   <li>searchByKeyword (List) – recherche par nom, description, code</li>
 *   <li>searchByKeyword (Page) – version paginée, bonne taille totale</li>
 *   <li>searchByDomaineIdAndKeyword – filtrage par domaine</li>
 *   <li>findByDomaineIdWithDomaine – filtre par domaine avec JOIN FETCH</li>
 * </ul>
 */
@DataJpaTest
@Import(TestAuditConfig.class)
@TestPropertySource(locations = "classpath:application.properties")
@DisplayName("CompetenceRepository – Tests @DataJpaTest")
class CompetenceRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private CompetenceRepository compRepo;

    private Domaine domaineA;
    private Domaine domaineB;

    @BeforeEach
    void setUp() {
        domaineA = em.persist(Domaine.builder()
                .code("DOM-A").nom("Domaine Alpha").actif(true).build());
        domaineB = em.persist(Domaine.builder()
                .code("DOM-B").nom("Domaine Beta").actif(true).build());

        em.persist(Competence.builder()
                .code("C-A1").nom("Mécanique des sols").description("Essais géotechniques").ordre(1)
                .domaine(domaineA).build());
        em.persist(Competence.builder()
                .code("C-A2").nom("Hydraulique").description("Calculs hydrauliques").ordre(2)
                .domaine(domaineA).build());
        em.persist(Competence.builder()
                .code("C-B1").nom("Béton armé").description("Dimensionnement béton").ordre(1)
                .domaine(domaineB).build());

        em.flush();
    }

    // ─── findAllWithDomaine ───────────────────────────────────────────────────
    @Nested
    @DisplayName("findAllWithDomaine")
    class FindAllWithDomaine {

        @Test
        @DisplayName("charge le domaine en JOIN FETCH – pas de LazyInitializationException")
        void shouldFetchDomaineEagerly() {
            List<Competence> result = compRepo.findAllWithDomaine();
            assertThat(result).hasSize(3);
            // Le domaine doit être chargé sans déclencher de lazy loading supplémentaire
            assertThat(result).allSatisfy(c -> assertThat(c.getDomaine().getNom()).isNotNull());
        }

        @Test
        @DisplayName("version paginée renvoie la bonne page")
        void shouldPageCorrectly() {
            Page<Competence> page = compRepo.findAllWithDomaine(PageRequest.of(0, 2));
            assertThat(page.getTotalElements()).isEqualTo(3);
            assertThat(page.getContent()).hasSize(2);
        }
    }

    // ─── searchByKeyword ──────────────────────────────────────────────────────
    @Nested
    @DisplayName("searchByKeyword")
    class SearchByKeyword {

        @Test
        @DisplayName("trouve par nom (insensible à la casse)")
        void shouldFindByNom() {
            List<Competence> result = compRepo.searchByKeyword("béton");
            assertThat(result).extracting(Competence::getCode).containsExactly("C-B1");
        }

        @Test
        @DisplayName("trouve par description")
        void shouldFindByDescription() {
            List<Competence> result = compRepo.searchByKeyword("hydrauliques");
            assertThat(result).extracting(Competence::getCode).containsExactly("C-A2");
        }

        @Test
        @DisplayName("trouve par code")
        void shouldFindByCode() {
            List<Competence> result = compRepo.searchByKeyword("C-A");
            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("version paginée – nombre total correct")
        void shouldReturnPagedResults() {
            Page<Competence> page = compRepo.searchByKeyword("C-A", PageRequest.of(0, 10));
            assertThat(page.getTotalElements()).isEqualTo(2);
        }

        @Test
        @DisplayName("renvoie liste vide pour un mot-clé inconnu")
        void shouldReturnEmptyForUnknown() {
            assertThat(compRepo.searchByKeyword("xyz-inconnu")).isEmpty();
        }
    }

    // ─── searchByDomaineIdAndKeyword ──────────────────────────────────────────
    @Nested
    @DisplayName("searchByDomaineIdAndKeyword")
    class SearchByDomaineIdAndKeyword {

        @Test
        @DisplayName("filtre correctement par domaine")
        void shouldFilterByDomaine() {
            List<Competence> result = compRepo.searchByDomaineIdAndKeyword(domaineA.getId(), "");
            assertThat(result).hasSize(2);
            assertThat(result).allSatisfy(c -> assertThat(c.getDomaine().getId()).isEqualTo(domaineA.getId()));
        }

        @Test
        @DisplayName("combine domaine ET mot-clé")
        void shouldFilterByDomaineAndKeyword() {
            List<Competence> result = compRepo.searchByDomaineIdAndKeyword(domaineA.getId(), "mécan");
            assertThat(result).extracting(Competence::getCode).containsExactly("C-A1");
        }
    }
}
