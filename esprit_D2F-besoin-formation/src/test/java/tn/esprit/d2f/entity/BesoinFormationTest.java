package tn.esprit.d2f.entity;

import org.junit.jupiter.api.Test;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

class BesoinFormationTest {

    @Test
    void testConstructorAndGettersSetters() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(1L);
        besoin.setUsername("user1");
        besoin.setTypeBesoin(TypeBesoin.COLLECTIF);
        besoin.setTitre("Titre");
        besoin.setObjectifFormation("Objectif");
        besoin.setPropositionAnimateur("Animateur");
        besoin.setPrerequis("Prerequis");
        besoin.setPublicCible("Public");
        besoin.setNbMaxParticipants(20);
        besoin.setProgrammeFormation("Programme");
        besoin.setDureeFormation(10);
        besoin.setTheme("Theme");
        besoin.setObjectifsOperationnels("Objectifs Operationnels");
        besoin.setObjectifsPedagogiques("Objectifs Pedagogiques");
        besoin.setMethodesPedagogiques("Methodes");
        besoin.setMoyensPedagogiques("Moyens");
        besoin.setMethodesEvaluationAcquis("Evaluation");
        besoin.setProfilFormateur("Profil");
        besoin.setHoraireSouhaite("Horaire");
        besoin.setUp("UP1");
        besoin.setDepartement("DEP1");
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(false);
        besoin.setApprouveAdmin(null);
        besoin.setNotificationMessage("Notification");
        besoin.setEventPublished(true);
        besoin.setPriorite(Priorite.HAUTE);
        besoin.setImpactStrategique("Impact");
        besoin.setEstOuverte(true);
        besoin.setAutresInformations("Autres Infos");
        besoin.setPeriodCode(PeriodCode.P1);
        besoin.setCustomPeriodLabel("Custom Label");

        assertThat(besoin).extracting(
                BesoinFormation::getIdBesoinFormation,
                BesoinFormation::getUsername,
                BesoinFormation::getTypeBesoin,
                BesoinFormation::getTitre,
                BesoinFormation::getObjectifFormation,
                BesoinFormation::getPropositionAnimateur,
                BesoinFormation::getPrerequis,
                BesoinFormation::getPublicCible,
                BesoinFormation::getNbMaxParticipants,
                BesoinFormation::getProgrammeFormation,
                BesoinFormation::getDureeFormation,
                BesoinFormation::getTheme,
                BesoinFormation::getObjectifsOperationnels,
                BesoinFormation::getObjectifsPedagogiques,
                BesoinFormation::getMethodesPedagogiques,
                BesoinFormation::getMoyensPedagogiques,
                BesoinFormation::getMethodesEvaluationAcquis,
                BesoinFormation::getProfilFormateur,
                BesoinFormation::getHoraireSouhaite,
                BesoinFormation::getUp,
                BesoinFormation::getDepartement,
                BesoinFormation::getApprouveCUP,
                BesoinFormation::getApprouveChefDep,
                BesoinFormation::getApprouveAdmin,
                BesoinFormation::getNotificationMessage,
                BesoinFormation::getEventPublished,
                BesoinFormation::getPriorite,
                BesoinFormation::getImpactStrategique,
                BesoinFormation::getEstOuverte,
                BesoinFormation::getAutresInformations,
                BesoinFormation::getPeriodCode,
                BesoinFormation::getCustomPeriodLabel
        ).containsExactly(
                1L, "user1", TypeBesoin.COLLECTIF, "Titre", "Objectif", "Animateur", "Prerequis", "Public", 20, "Programme", 10, "Theme", "Objectifs Operationnels",
                "Objectifs Pedagogiques", "Methodes", "Moyens", "Evaluation", "Profil", "Horaire", "UP1", "DEP1", true, false, null, "Notification", true, Priorite.HAUTE, "Impact", true, "Autres Infos", PeriodCode.P1, "Custom Label"
        );
    }

    @Test
    void testAllArgsConstructor() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(1L);
        besoin.setUsername("user1");
        besoin.setTypeBesoin(TypeBesoin.COLLECTIF);
        besoin.setObjectifFormation("Objectif");
        besoin.setNbMaxParticipants(20);
        besoin.setDureeFormation(10);
        besoin.setTitre("Titre");
        besoin.setUp("UP1");
        besoin.setDepartement("DEP1");
        besoin.setPriorite(Priorite.HAUTE);

        assertAll("Verify partial fields",
            () -> assertEquals(1L, besoin.getIdBesoinFormation()),
            () -> assertEquals("user1", besoin.getUsername()),
            () -> assertEquals(TypeBesoin.COLLECTIF, besoin.getTypeBesoin()),
            () -> assertEquals("Objectif", besoin.getObjectifFormation()),
            () -> assertEquals(20, besoin.getNbMaxParticipants()),
            () -> assertEquals(10, besoin.getDureeFormation()),
            () -> assertEquals("Titre", besoin.getTitre()),
            () -> assertEquals("UP1", besoin.getUp()),
            () -> assertEquals("DEP1", besoin.getDepartement()),
            () -> assertEquals(Priorite.HAUTE, besoin.getPriorite())
        );
    }

    @Test
    void testBooleanGetters() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(false);
        besoin.setApprouveAdmin(null);
        besoin.setEventPublished(true);

        assertAll("Verify boolean getters",
            () -> assertTrue(besoin.isApprouveCUP()),
            () -> assertFalse(besoin.isApprouveChefDep()),
            () -> assertNull(besoin.isApprouveAdmin()),
            () -> assertTrue(besoin.getEventPublished())
        );
    }

    @Test
    void testBooleanSettersAndGetters() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setApprouveCUP(true);
        besoin.setApprouveChefDep(false);
        besoin.setApprouveAdmin(null);

        assertAll("Verify boolean setters/getters",
            () -> assertTrue(besoin.getApprouveCUP()),
            () -> assertFalse(besoin.getApprouveChefDep()),
            () -> assertNull(besoin.getApprouveAdmin())
        );
    }

    @Test
    void testDefaultValues() {
        BesoinFormation besoin = new BesoinFormation();

        assertAll("Verify defaults",
            () -> assertFalse(besoin.getEventPublished()),
            () -> assertFalse(besoin.getEstOuverte())
        );
    }

    @Test
    void testIdSetter() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(1L);

        assertEquals(1L, besoin.getIdBesoinFormation());
    }

    @Test
    void testToString() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setIdBesoinFormation(1L);
        besoin.setUsername("user1");
        besoin.setTitre("Titre");

        String toString = besoin.toString();

        assertAll("Verify toString content",
            () -> assertNotNull(toString),
            () -> assertTrue(toString.contains("idBesoinFormation")),
            () -> assertTrue(toString.contains("username")),
            () -> assertTrue(toString.contains("titre"))
        );
    }

    @Test
    void testWithNullValues() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setUsername(null);
        besoin.setTypeBesoin(null);
        besoin.setTitre(null);
        besoin.setPriorite(null);
        besoin.setPeriodCode(null);

        assertAll("Verify nulls",
            () -> assertNull(besoin.getUsername()),
            () -> assertNull(besoin.getTypeBesoin()),
            () -> assertNull(besoin.getTitre()),
            () -> assertNull(besoin.getPriorite()),
            () -> assertNull(besoin.getPeriodCode())
        );
    }

    @Test
    void testWithEmptyStrings() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setUsername("");
        besoin.setTitre("");
        besoin.setObjectifFormation("");

        assertAll("Verify empty strings",
            () -> assertEquals("", besoin.getUsername()),
            () -> assertEquals("", besoin.getTitre()),
            () -> assertEquals("", besoin.getObjectifFormation())
        );
    }

    @Test
    void testWithZeroValues() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setNbMaxParticipants(0);
        besoin.setDureeFormation(0);

        assertAll("Verify zero values",
            () -> assertEquals(0, besoin.getNbMaxParticipants()),
            () -> assertEquals(0, besoin.getDureeFormation())
        );
    }

    @Test
    void testAllEnums() {
        BesoinFormation besoin = new BesoinFormation();
        besoin.setTypeBesoin(TypeBesoin.COLLECTIF);
        besoin.setPriorite(Priorite.HAUTE);
        besoin.setPeriodCode(PeriodCode.P1);

        assertAll("Verify enums",
            () -> assertEquals(TypeBesoin.COLLECTIF, besoin.getTypeBesoin()),
            () -> assertEquals(Priorite.HAUTE, besoin.getPriorite()),
            () -> assertEquals(PeriodCode.P1, besoin.getPeriodCode())
        );
    }
}
