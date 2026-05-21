package tn.esprit.d2f.dto;

import org.junit.jupiter.api.Test;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

class BesoinFormationResponseTest {

    @Test
    void testBuilder() {
        BesoinFormationResponse response = BesoinFormationResponse.builder()
                .idBesoinFormation(1L)
                .username("user1")
                .typeBesoin(TypeBesoin.COLLECTIF)
                .titre("Titre")
                .objectifFormation("Objectif")
                .nbMaxParticipants(20)
                .dureeFormation(10)
                .up("UP1")
                .departement("DEP1")
                .priorite(Priorite.HAUTE)
                .propositionAnimateur("Animateur")
                .prerequis("Prerequis")
                .publicCible("Public")
                .programmeFormation("Programme")
                .theme("Theme")
                .objectifsOperationnels("Objectifs Operationnels")
                .objectifsPedagogiques("Objectifs Pedagogiques")
                .methodesPedagogiques("Methodes")
                .moyensPedagogiques("Moyens")
                .methodesEvaluationAcquis("Evaluation")
                .profilFormateur("Profil")
                .horaireSouhaite("Horaire")
                .impactStrategique("Impact")
                .estOuverte(true)
                .autresInformations("Autres Infos")
                .periodCode(PeriodCode.WINTER)
                .customPeriodLabel("Custom Label")
                .eventPublished(true)
                .notificationMessage("Notification")
                .approuveCUP(true)
                .approuveChefDep(false)
                .approuveAdmin(null)
                .build();

        assertThat(response).extracting(
                BesoinFormationResponse::getIdBesoinFormation,
                BesoinFormationResponse::getUsername,
                BesoinFormationResponse::getTypeBesoin,
                BesoinFormationResponse::getTitre,
                BesoinFormationResponse::getObjectifFormation,
                BesoinFormationResponse::getNbMaxParticipants,
                BesoinFormationResponse::getDureeFormation,
                BesoinFormationResponse::getUp,
                BesoinFormationResponse::getDepartement,
                BesoinFormationResponse::getPriorite,
                BesoinFormationResponse::getPropositionAnimateur,
                BesoinFormationResponse::getPrerequis,
                BesoinFormationResponse::getPublicCible,
                BesoinFormationResponse::getProgrammeFormation,
                BesoinFormationResponse::getTheme,
                BesoinFormationResponse::getObjectifsOperationnels,
                BesoinFormationResponse::getObjectifsPedagogiques,
                BesoinFormationResponse::getMethodesPedagogiques,
                BesoinFormationResponse::getMoyensPedagogiques,
                BesoinFormationResponse::getMethodesEvaluationAcquis,
                BesoinFormationResponse::getProfilFormateur,
                BesoinFormationResponse::getHoraireSouhaite,
                BesoinFormationResponse::getImpactStrategique,
                BesoinFormationResponse::getEstOuverte,
                BesoinFormationResponse::getAutresInformations,
                BesoinFormationResponse::getPeriodCode,
                BesoinFormationResponse::getCustomPeriodLabel,
                BesoinFormationResponse::getEventPublished,
                BesoinFormationResponse::getNotificationMessage,
                BesoinFormationResponse::getApprouveCUP,
                BesoinFormationResponse::getApprouveChefDep,
                BesoinFormationResponse::getApprouveAdmin
        ).containsExactly(
                1L, "user1", TypeBesoin.COLLECTIF, "Titre", "Objectif", 20, 10, "UP1", "DEP1", Priorite.HAUTE,
                "Animateur", "Prerequis", "Public", "Programme", "Theme", "Objectifs Operationnels",
                "Objectifs Pedagogiques", "Methodes", "Moyens", "Evaluation", "Profil", "Horaire",
                "Impact", true, "Autres Infos", PeriodCode.WINTER, "Custom Label", true, "Notification", true, false, null
        );
    }

    @Test
    void testNoArgsConstructor() {
        BesoinFormationResponse response = new BesoinFormationResponse();

        assertThat(response).extracting(
                BesoinFormationResponse::getIdBesoinFormation,
                BesoinFormationResponse::getUsername,
                BesoinFormationResponse::getNbMaxParticipants,
                BesoinFormationResponse::getDureeFormation,
                BesoinFormationResponse::getApprouveAdmin
        ).containsExactly(0L, null, 0, 0, null);
        
        assertThat(response).usingRecursiveComparison()
                .ignoringFields("idBesoinFormation", "nbMaxParticipants", "dureeFormation")
                .isEqualTo(new BesoinFormationResponse());
    }

    @Test
    void testAllArgsConstructor() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setIdBesoinFormation(1L);
        response.setUsername("user1");
        response.setTypeBesoin(TypeBesoin.COLLECTIF);
        response.setTitre("Titre");
        response.setObjectifFormation("Objectif");
        response.setNbMaxParticipants(20);
        response.setDureeFormation(10);
        response.setUp("UP1");
        response.setDepartement("DEP1");
        response.setPriorite(Priorite.HAUTE);

        assertAll("Verify partial all-args fields",
            () -> assertEquals(1L, response.getIdBesoinFormation()),
            () -> assertEquals("user1", response.getUsername()),
            () -> assertEquals(TypeBesoin.COLLECTIF, response.getTypeBesoin()),
            () -> assertEquals("Titre", response.getTitre()),
            () -> assertEquals("Objectif", response.getObjectifFormation()),
            () -> assertEquals(20, response.getNbMaxParticipants()),
            () -> assertEquals(10, response.getDureeFormation()),
            () -> assertEquals("UP1", response.getUp()),
            () -> assertEquals("DEP1", response.getDepartement()),
            () -> assertEquals(Priorite.HAUTE, response.getPriorite())
        );
    }

    @Test
    void testSettersAndGetters() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setIdBesoinFormation(1L);
        response.setUsername("user1");
        response.setTypeBesoin(TypeBesoin.COLLECTIF);
        response.setTitre("Titre");
        response.setObjectifFormation("Objectif");
        response.setNbMaxParticipants(20);
        response.setDureeFormation(10);
        response.setUp("UP1");
        response.setDepartement("DEP1");
        response.setPriorite(Priorite.HAUTE);
        response.setPropositionAnimateur("Animateur");
        response.setPrerequis("Prerequis");
        response.setPublicCible("Public");
        response.setProgrammeFormation("Programme");
        response.setTheme("Theme");
        response.setObjectifsOperationnels("Objectifs Operationnels");
        response.setObjectifsPedagogiques("Objectifs Pedagogiques");
        response.setMethodesPedagogiques("Methodes");
        response.setMoyensPedagogiques("Moyens");
        response.setMethodesEvaluationAcquis("Evaluation");
        response.setProfilFormateur("Profil");
        response.setHoraireSouhaite("Horaire");
        response.setImpactStrategique("Impact");
        response.setEstOuverte(true);
        response.setAutresInformations("Autres Infos");
        response.setPeriodCode(PeriodCode.WINTER);
        response.setCustomPeriodLabel("Custom Label");
        response.setEventPublished(true);
        response.setNotificationMessage("Notification");
        response.setApprouveCUP(true);
        response.setApprouveChefDep(false);
        response.setApprouveAdmin(null);

        assertThat(response).extracting(
                BesoinFormationResponse::getIdBesoinFormation,
                BesoinFormationResponse::getUsername,
                BesoinFormationResponse::getTypeBesoin,
                BesoinFormationResponse::getTitre,
                BesoinFormationResponse::getObjectifFormation,
                BesoinFormationResponse::getNbMaxParticipants,
                BesoinFormationResponse::getDureeFormation,
                BesoinFormationResponse::getUp,
                BesoinFormationResponse::getDepartement,
                BesoinFormationResponse::getPriorite,
                BesoinFormationResponse::getPropositionAnimateur,
                BesoinFormationResponse::getPrerequis,
                BesoinFormationResponse::getPublicCible,
                BesoinFormationResponse::getProgrammeFormation,
                BesoinFormationResponse::getTheme,
                BesoinFormationResponse::getObjectifsOperationnels,
                BesoinFormationResponse::getObjectifsPedagogiques,
                BesoinFormationResponse::getMethodesPedagogiques,
                BesoinFormationResponse::getMoyensPedagogiques,
                BesoinFormationResponse::getMethodesEvaluationAcquis,
                BesoinFormationResponse::getProfilFormateur,
                BesoinFormationResponse::getHoraireSouhaite,
                BesoinFormationResponse::getImpactStrategique,
                BesoinFormationResponse::getEstOuverte,
                BesoinFormationResponse::getAutresInformations,
                BesoinFormationResponse::getPeriodCode,
                BesoinFormationResponse::getCustomPeriodLabel,
                BesoinFormationResponse::getEventPublished,
                BesoinFormationResponse::getNotificationMessage,
                BesoinFormationResponse::getApprouveCUP,
                BesoinFormationResponse::getApprouveChefDep,
                BesoinFormationResponse::getApprouveAdmin
        ).containsExactly(
                1L, "user1", TypeBesoin.COLLECTIF, "Titre", "Objectif", 20, 10, "UP1", "DEP1", Priorite.HAUTE,
                "Animateur", "Prerequis", "Public", "Programme", "Theme", "Objectifs Operationnels",
                "Objectifs Pedagogiques", "Methodes", "Moyens", "Evaluation", "Profil", "Horaire",
                "Impact", true, "Autres Infos", PeriodCode.WINTER, "Custom Label", true, "Notification", true, false, null
        );
    }

    @Test
    void testWithNullValues() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setUsername(null);
        response.setTypeBesoin(null);
        response.setTitre(null);
        response.setPriorite(null);
        response.setPeriodCode(null);

        assertAll("Verify null values",
            () -> assertNull(response.getUsername()),
            () -> assertNull(response.getTypeBesoin()),
            () -> assertNull(response.getTitre()),
            () -> assertNull(response.getPriorite()),
            () -> assertNull(response.getPeriodCode())
        );
    }

    @Test
    void testWithEmptyStrings() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setUsername("");
        response.setTitre("");
        response.setObjectifFormation("");

        assertAll("Verify empty strings",
            () -> assertEquals("", response.getUsername()),
            () -> assertEquals("", response.getTitre()),
            () -> assertEquals("", response.getObjectifFormation())
        );
    }

    @Test
    void testWithZeroValues() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setNbMaxParticipants(0);
        response.setDureeFormation(0);

        assertAll("Verify zero values",
            () -> assertEquals(0, response.getNbMaxParticipants()),
            () -> assertEquals(0, response.getDureeFormation())
        );
    }

    @Test
    void testWithBooleanValues() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setEstOuverte(true);
        response.setApprouveCUP(true);
        response.setApprouveChefDep(false);
        response.setApprouveAdmin(null);
        response.setEventPublished(false);

        assertAll("Verify boolean values",
            () -> assertTrue(response.getEstOuverte()),
            () -> assertTrue(response.getApprouveCUP()),
            () -> assertFalse(response.getApprouveChefDep()),
            () -> assertNull(response.getApprouveAdmin()),
            () -> assertFalse(response.getEventPublished())
        );
    }

    @Test
    void testAllEnums() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setTypeBesoin(TypeBesoin.COLLECTIF);
        response.setPriorite(Priorite.HAUTE);
        response.setPeriodCode(PeriodCode.WINTER);

        assertAll("Verify enums",
            () -> assertEquals(TypeBesoin.COLLECTIF, response.getTypeBesoin()),
            () -> assertEquals(Priorite.HAUTE, response.getPriorite()),
            () -> assertEquals(PeriodCode.WINTER, response.getPeriodCode())
        );
    }

    @Test
    void testDefaultValues() {
        BesoinFormationResponse response = new BesoinFormationResponse();

        assertAll("Verify defaults",
            () -> assertEquals(0L, response.getIdBesoinFormation()),
            () -> assertEquals(0, response.getNbMaxParticipants()),
            () -> assertEquals(0, response.getDureeFormation())
        );
    }

    @Test
    void testLongValues() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        String longString = "A".repeat(1000);
        response.setAutresInformations(longString);
        response.setNotificationMessage(longString);

        assertAll("Verify long values",
            () -> assertEquals(longString, response.getAutresInformations()),
            () -> assertEquals(longString, response.getNotificationMessage())
        );
    }

    @Test
    void testSpecialCharacters() {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setObjectifFormation("Objectif with émojis 🎉 and special chars !@#$%");
        response.setNotificationMessage("Message with accents: éàü");

        assertAll("Verify special characters",
            () -> assertEquals("Objectif with émojis 🎉 and special chars !@#$%", response.getObjectifFormation()),
            () -> assertEquals("Message with accents: éàü", response.getNotificationMessage())
        );
    }
}
