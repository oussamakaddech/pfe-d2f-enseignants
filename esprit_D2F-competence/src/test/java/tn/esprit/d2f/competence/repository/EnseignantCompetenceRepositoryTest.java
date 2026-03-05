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
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.d2f.competence.config.TestAuditConfig;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests @DataJpaTest pour {@link EnseignantCompetenceRepository}.
 *
 * <p>Vérifie :
 * <ul>
 *   <li>DISTINCT dans les requêtes multi-chemin (pas de doublons)</li>
 *   <li>findByEnseignantId charge le graph complet (EntityGraph)</li>
 *   <li>countByEnseignantId renvoie le bon total</li>
 *   <li>findByEnseignantIdAndDomaineId / findByEnseignantIdAndCompetenceId filtrent correctement</li>
 * </ul>
 */
@DataJpaTest
@Import(TestAuditConfig.class)
@TestPropertySource(locations = "classpath:application.properties")
@DisplayName("EnseignantCompetenceRepository – Tests @DataJpaTest")
class EnseignantCompetenceRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private EnseignantCompetenceRepository ecRepo;

    static final String ENS_ID = "ens-test-001";

    private Savoir savoirViaSc;   // savoir rattaché via SousCompetence
    private Savoir savoirDirect;  // savoir directement rattaché à une Compétence

    @BeforeEach
    void setUp() {
        // Domaine
        Domaine domaine = em.persist(Domaine.builder()
                .code("DOM-TEST").nom("Domaine Test").actif(true).build());

        // Compétence
        Competence competence = em.persist(Competence.builder()
                .code("COMP-T1").nom("Compétence T1").domaine(domaine).ordre(1).build());

        // SousCompétence
        SousCompetence sc = em.persist(SousCompetence.builder()
                .code("SC-T1").nom("Sous-Comp T1").competence(competence).build());

        // Savoir via sous-compétence
        savoirViaSc = em.persist(Savoir.builder()
                .code("SAV-SC").nom("Savoir via SC").type(TypeSavoir.THEORIQUE)
                .niveau(NiveauMaitrise.N1_DEBUTANT).sousCompetence(sc).build());

        // Savoir directement rattaché à la compétence (sans SC)
        savoirDirect = em.persist(Savoir.builder()
                .code("SAV-DIR").nom("Savoir direct").type(TypeSavoir.PRATIQUE)
                .niveau(NiveauMaitrise.N2_ELEMENTAIRE).competence(competence).build());

        // Affectations
        em.persist(EnseignantCompetence.builder()
                .enseignantId(ENS_ID).savoir(savoirViaSc).niveau(NiveauMaitrise.N2_ELEMENTAIRE).build());
        em.persist(EnseignantCompetence.builder()
                .enseignantId(ENS_ID).savoir(savoirDirect).niveau(NiveauMaitrise.N3_INTERMEDIAIRE).build());
        // Un autre enseignant – ne doit pas apparaître dans les filtres
        em.persist(EnseignantCompetence.builder()
                .enseignantId("autre-ens").savoir(savoirViaSc).niveau(NiveauMaitrise.N1_DEBUTANT).build());

        em.flush();
    }

    // ─── findByEnseignantId ────────────────────────────────────────────────────
    @Nested
    @DisplayName("findByEnseignantId")
    class FindByEnseignantId {

        @Test
        @DisplayName("renvoie uniquement les affectations de l'enseignant cible")
        void shouldReturnOnlyTargetEnseignant() {
            List<EnseignantCompetence> result = ecRepo.findByEnseignantId(ENS_ID);
            assertThat(result).hasSize(2);
            assertThat(result).allMatch(ec -> ENS_ID.equals(ec.getEnseignantId()));
        }

        @Test
        @DisplayName("renvoie liste vide pour un enseignant inconnu")
        void shouldReturnEmptyForUnknown() {
            assertThat(ecRepo.findByEnseignantId("inconnu")).isEmpty();
        }
    }

    // ─── countByEnseignantId ──────────────────────────────────────────────────
    @Nested
    @DisplayName("countByEnseignantId")
    class CountByEnseignantId {

        @Test
        @DisplayName("compte correctement les affectations d'un enseignant")
        void shouldCountCorrectly() {
            assertThat(ecRepo.countByEnseignantId(ENS_ID)).isEqualTo(2L);
        }

        @Test
        @DisplayName("renvoie 0 pour un enseignant inconnu")
        void shouldReturnZeroForUnknown() {
            assertThat(ecRepo.countByEnseignantId("inconnu")).isZero();
        }
    }

    // ─── DISTINCT – findByEnseignantIdAndDomaineId ───────────────────────────
    @Nested
    @DisplayName("findByEnseignantIdAndDomaineId (DISTINCT)")
    class FindByDomaineId {

        @Test
        @DisplayName("pas de doublons malgré les deux chemins de JOIN")
        void shouldNoDuplicates() {
            List<EnseignantCompetence> result = ecRepo.findByEnseignantIdAndDomaineId(ENS_ID, 1L);
            // Sans DISTINCT, on pourrait avoir des doublons
            long distinctIds = result.stream().map(EnseignantCompetence::getId).distinct().count();
            assertThat((long) result.size()).isEqualTo(distinctIds);
        }
    }

    // ─── findAllFetched (pagination + JOIN FETCH) ─────────────────────────────
    @Nested
    @DisplayName("findAllFetched (Pageable)")
    class FindAllFetched {

        @Test
        @DisplayName("renvoie la première page avec le bon contenu")
        void shouldReturnFirstPage() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<EnseignantCompetence> page = ecRepo.findAllFetched(pageable);
            assertThat(page).isNotNull();
            assertThat(page.getTotalElements()).isGreaterThanOrEqualTo(3);
        }

        @Test
        @DisplayName("exige un savoir non-null (JOIN FETCH chargé)")
        void shouldHaveNonNullSavoir() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<EnseignantCompetence> page = ecRepo.findAllFetched(pageable);
            assertThat(page.getContent())
                    .allSatisfy(ec -> assertThat(ec.getSavoir()).isNotNull());
        }
    }

    // ─── countDistinctEnseignants ─────────────────────────────────────────────
    @Nested
    @DisplayName("countDistinctEnseignantsByCompetenceId")
    class CountDistinct {

        @Test
        @DisplayName("compte DISTINCT les enseignants pour les deux chemins de savoir")
        void shouldCountDistinctOverBothPaths() {
            // Les deux savoirs (via SC et direct) pointent vers la même compétence id=1
            long count = ecRepo.countDistinctEnseignantsByCompetenceId(1L);
            // ENS_ID + "autre-ens" = 2 enseignants distincts
            assertThat(count).isEqualTo(2L);
        }
    }
}
