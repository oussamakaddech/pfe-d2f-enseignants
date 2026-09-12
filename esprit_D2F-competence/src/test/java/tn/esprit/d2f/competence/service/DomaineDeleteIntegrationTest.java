package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.d2f.competence.config.TestAuditConfig;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.NiveauSavoirRequis;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.Mockito.mock;

/**
 * Test d'intégration de {@link DomaineServiceImpl#deleteDomaine(Long)} avec les
 * vrais repositories (H2).
 *
 * <p>Régression : la suppression d'un domaine dont les savoirs sont rattachés
 * directement aux compétences (sans sous-compétences – cas du domaine 6 « Génie
 * Civil » en production) répondait 409 Conflict. Le nettoyage
 * {@code EnseignantCompetenceRepository.deleteByDomaineId} utilisait un OR sur
 * navigations JPQL implicites (INNER JOIN) qui ne supprimait aucune des lignes
 * liées aux savoirs directs ; la cascade Hibernate vers {@code savoirs} violait
 * ensuite la FK {@code enseignant_competences.savoir_id}.
 */
@DataJpaTest
@Import(TestAuditConfig.class)
@TestPropertySource(locations = "classpath:application.properties")
@DisplayName("DomaineServiceImpl.deleteDomaine – Test d'intégration (régression 409)")
class DomaineDeleteIntegrationTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private DomaineRepository domaineRepository;
    @Autowired
    private EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Autowired
    private NiveauSavoirRequisRepository niveauRepo;
    @Autowired
    private SavoirRepository savoirRepository;
    @Autowired
    private CompetencePrerequisiteRepository prerequisiteRepository;

    private DomaineServiceImpl domaineService;
    private Long domaineId;

    @BeforeEach
    void setUp() {
        domaineService = new DomaineServiceImpl(
                domaineRepository,
                enseignantCompetenceRepository,
                niveauRepo,
                savoirRepository,
                prerequisiteRepository,
                mock(CompetenceMapper.class));

        // Domaine « façon domaine 6 » : compétence -> savoirs directs + affectations + NSR
        Domaine domaine = em.persist(Domaine.builder()
                .code("DOM-GC").nom("Génie Civil Test").actif(true).build());
        Competence competence = em.persist(Competence.builder()
                .code("GC.STRUCT").nom("Structures").domaine(domaine).ordre(1).build());
        Savoir savoir = em.persist(Savoir.builder()
                .code("S.GC.BA").nom("Béton armé").type(TypeSavoir.PRATIQUE)
                .niveau(NiveauMaitrise.N2_ELEMENTAIRE).competence(competence).build());
        em.persist(EnseignantCompetence.builder()
                .enseignantId("ens-001").savoir(savoir).niveau(NiveauMaitrise.N2_ELEMENTAIRE).build());
        em.persist(NiveauSavoirRequis.builder()
                .competence(competence).savoir(savoir).niveau(NiveauMaitrise.N3_INTERMEDIAIRE).build());
        em.flush();
        // Détache tout : le service recharge un état frais depuis la DB,
        // comme en production (les DELETE JPQL bulk contournent le contexte
        // de persistance, les entités managées deviendraient obsolètes).
        domaineId = domaine.getId();
        em.clear();
    }

    @Test
    @DisplayName("supprime un domaine à savoirs directs avec affectations sans violation FK")
    void shouldDeleteDomaineWithDirectSavoirsAndAssignments() {
        assertThatNoException().isThrownBy(() -> domaineService.deleteDomaine(domaineId));
        em.flush();
        em.clear();

        assertThat(domaineRepository.existsById(domaineId)).isFalse();
        assertThat(savoirRepository.findIdsByDomaineId(domaineId)).isEmpty();
        assertThat(enseignantCompetenceRepository.findSavoirIdsByDomaineId(domaineId)).isEmpty();
        assertThat(niveauRepo.findAll()).isEmpty();
        assertThat(enseignantCompetenceRepository.count()).isZero();
    }
}
