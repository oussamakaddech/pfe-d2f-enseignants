package tn.esprit.d2f.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class BesoinFormationRepositoryTest {

    // Required: @EnableJpaAuditing on the main class references "auditorProvider" by name.
    // @DataJpaTest slices don't scan the full context, so we provide a mock.
    @SuppressWarnings("rawtypes")
    @MockitoBean(name = "auditorProvider")
    private AuditorAware auditorProvider;

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private BesoinFormationRepository repository;

    private BesoinFormation besoin1;
    private BesoinFormation besoin2;
    private BesoinFormation besoin3;

    @BeforeEach
    void setUp() {
        besoin1 = new BesoinFormation();
        besoin1.setUsername("user1");
        besoin1.setTypeBesoin(TypeBesoin.COLLECTIF);
        besoin1.setTitre("Formation 1");
        besoin1.setUp("UP1");
        besoin1.setDepartement("DEP1");
        besoin1.setPriorite(Priorite.HAUTE);
        besoin1.setApprouveAdmin(true);
        besoin1.setNbMaxParticipants(20);
        besoin1.setDureeFormation(10);

        besoin2 = new BesoinFormation();
        besoin2.setUsername("user2");
        besoin2.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        besoin2.setTitre("Formation 2");
        besoin2.setUp("UP1");
        besoin2.setDepartement("DEP2");
        besoin2.setPriorite(Priorite.MOYENNE);
        besoin2.setApprouveAdmin(true);
        besoin2.setNbMaxParticipants(10);
        besoin2.setDureeFormation(5);

        besoin3 = new BesoinFormation();
        besoin3.setUsername("user3");
        besoin3.setTypeBesoin(TypeBesoin.COLLECTIF);
        besoin3.setTitre("Formation 3");
        besoin3.setUp("UP2");
        besoin3.setDepartement("DEP1");
        besoin3.setPriorite(Priorite.BASSE);
        besoin3.setApprouveAdmin(false);
        besoin3.setNbMaxParticipants(15);
        besoin3.setDureeFormation(8);

        entityManager.persist(besoin1);
        entityManager.persist(besoin2);
        entityManager.persist(besoin3);
        entityManager.flush();
    }

    @Test
    void testFindByApprouveAdminTrue() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByApprouveAdminTrue(pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertTrue(result.getContent().stream().allMatch(b -> b.getApprouveAdmin()));
    }

    @Test
    void testFindByUp() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByUp("UP1", pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertTrue(result.getContent().stream().allMatch(b -> "UP1".equals(b.getUp())));
    }

    @Test
    void testFindByDepartement() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByDepartement("DEP1", pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertTrue(result.getContent().stream().allMatch(b -> "DEP1".equals(b.getDepartement())));
    }

    @Test
    void testFindByUpAndDepartement() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByUpAndDepartement("UP1", "DEP1", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertTrue(result.getContent().stream().allMatch(b -> "UP1".equals(b.getUp()) && "DEP1".equals(b.getDepartement())));
    }

    @Test
    void testFindAllByOrderByPrioriteDesc() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findAllByOrderByPrioriteDesc(pageable);

        assertNotNull(result);
        assertEquals(3, result.getTotalElements());

        // Vérifier que les résultats sont triés par priorité décroissante
        // Note: JPA sorts enums as strings (BASSE, HAUTE, MOYENNE) not by ordinal
        // So DESC string order: MOYENNE > HAUTE > BASSE
        assertEquals(Priorite.MOYENNE, result.getContent().get(0).getPriorite());
        assertEquals(Priorite.HAUTE, result.getContent().get(1).getPriorite());
        assertEquals(Priorite.BASSE, result.getContent().get(2).getPriorite());
    }

    @Test
    void testFindByPriorite() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByPriorite(Priorite.HAUTE, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertTrue(result.getContent().stream().allMatch(b -> Priorite.HAUTE.equals(b.getPriorite())));
    }

    @Test
    void testFindByPrioriteWithMultipleResults() {
        // Ajouter un autre besoin avec la même priorité
        BesoinFormation besoin4 = new BesoinFormation();
        besoin4.setUsername("user4");
        besoin4.setTypeBesoin(TypeBesoin.COLLECTIF);
        besoin4.setTitre("Formation 4");
        besoin4.setUp("UP2");
        besoin4.setDepartement("DEP2");
        besoin4.setPriorite(Priorite.HAUTE);
        besoin4.setApprouveAdmin(false);
        besoin4.setNbMaxParticipants(25);
        besoin4.setDureeFormation(12);

        entityManager.persist(besoin4);
        entityManager.flush();

        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByPriorite(Priorite.HAUTE, pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertTrue(result.getContent().stream().allMatch(b -> Priorite.HAUTE.equals(b.getPriorite())));
    }

    @Test
    void testFindByPrioriteWithNoResults() {
        Pageable pageable = PageRequest.of(0, 10);
        // Use CRITIQUE which was not persisted in setUp
        Page<BesoinFormation> result = repository.findByPriorite(Priorite.CRITIQUE, pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void testFindByUpWithNoResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByUp("UP3", pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void testFindByDepartementWithNoResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByDepartement("DEP3", pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void testFindByUpAndDepartementWithNoResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BesoinFormation> result = repository.findByUpAndDepartement("UP2", "DEP2", pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
    }
}
