package tn.esprit.d2f.dto;

import org.junit.jupiter.api.Test;
import tn.esprit.d2f.entity.enumerations.PeriodCode;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

class BesoinFormationRequestTest {

    @Test
    void testBuilder() {
        BesoinFormationRequest request = BesoinFormationRequest.builder()
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
                .periodCode(PeriodCode.P1)
                .customPeriodLabel("Custom Label")
                .commentaire("Commentaire")
                .approuveCUP(true)
                .approuveChefDep(false)
                .approuveAdmin(null)
                .build();

        assertThat(request).extracting(
                BesoinFormationRequest::getIdBesoinFormation,
                BesoinFormationRequest::getUsername,
                BesoinFormationRequest::getTypeBesoin,
                BesoinFormationRequest::getTitre,
                BesoinFormationRequest::getObjectifFormation,
                BesoinFormationRequest::getNbMaxParticipants,
                BesoinFormationRequest::getDureeFormation,
                BesoinFormationRequest::getUp,
                BesoinFormationRequest::getDepartement,
                BesoinFormationRequest::getPriorite,
                BesoinFormationRequest::getPropositionAnimateur,
                BesoinFormationRequest::getPrerequis,
                BesoinFormationRequest::getPublicCible,
                BesoinFormationRequest::getProgrammeFormation,
                BesoinFormationRequest::getTheme,
                BesoinFormationRequest::getObjectifsOperationnels,
                BesoinFormationRequest::getObjectifsPedagogiques,
                BesoinFormationRequest::getMethodesPedagogiques,
                BesoinFormationRequest::getMoyensPedagogiques,
                BesoinFormationRequest::getMethodesEvaluationAcquis,
                BesoinFormationRequest::getProfilFormateur,
                BesoinFormationRequest::getHoraireSouhaite,
                BesoinFormationRequest::getImpactStrategique,
                BesoinFormationRequest::getEstOuverte,
                BesoinFormationRequest::getAutresInformations,
                BesoinFormationRequest::getPeriodCode,
                BesoinFormationRequest::getCustomPeriodLabel,
                BesoinFormationRequest::getCommentaire,
                BesoinFormationRequest::getApprouveCUP,
                BesoinFormationRequest::getApprouveChefDep,
                BesoinFormationRequest::getApprouveAdmin
        ).containsExactly(
                1L, "user1", TypeBesoin.COLLECTIF, "Titre", "Objectif", 20, 10, "UP1", "DEP1", Priorite.HAUTE,
                "Animateur", "Prerequis", "Public", "Programme", "Theme", "Objectifs Operationnels",
                "Objectifs Pedagogiques", "Methodes", "Moyens", "Evaluation", "Profil", "Horaire",
                "Impact", true, "Autres Infos", PeriodCode.P1, "Custom Label", "Commentaire", true, false, null
        );
    }

    @Test
    void testNoArgsConstructor() {
        BesoinFormationRequest request = new BesoinFormationRequest();

        assertThat(request).hasAllNullFieldsOrProperties();
    }

    @Test
    void testAllArgsConstructor() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setUsername("user1");
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setTitre("Titre");
        request.setObjectifFormation("Objectif");
        request.setNbMaxParticipants(20);
        request.setDureeFormation(10);
        request.setUp("UP1");
        request.setDepartement("DEP1");
        request.setPriorite(Priorite.HAUTE);

        assertAll("Verify partial all-args fields",
            () -> assertEquals(1L, request.getIdBesoinFormation()),
            () -> assertEquals("user1", request.getUsername()),
            () -> assertEquals(TypeBesoin.COLLECTIF, request.getTypeBesoin()),
            () -> assertEquals("Titre", request.getTitre()),
            () -> assertEquals("Objectif", request.getObjectifFormation()),
            () -> assertEquals(20, request.getNbMaxParticipants()),
            () -> assertEquals(10, request.getDureeFormation()),
            () -> assertEquals("UP1", request.getUp()),
            () -> assertEquals("DEP1", request.getDepartement()),
            () -> assertEquals(Priorite.HAUTE, request.getPriorite())
        );
    }

    @Test
    void testSettersAndGetters() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setIdBesoinFormation(1L);
        request.setUsername("user1");
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setTitre("Titre");
        request.setObjectifFormation("Objectif");
        request.setNbMaxParticipants(20);
        request.setDureeFormation(10);
        request.setUp("UP1");
        request.setDepartement("DEP1");
        request.setPriorite(Priorite.HAUTE);
        request.setPropositionAnimateur("Animateur");
        request.setPrerequis("Prerequis");
        request.setPublicCible("Public");
        request.setProgrammeFormation("Programme");
        request.setTheme("Theme");
        request.setObjectifsOperationnels("Objectifs Operationnels");
        request.setObjectifsPedagogiques("Objectifs Pedagogiques");
        request.setMethodesPedagogiques("Methodes");
        request.setMoyensPedagogiques("Moyens");
        request.setMethodesEvaluationAcquis("Evaluation");
        request.setProfilFormateur("Profil");
        request.setHoraireSouhaite("Horaire");
        request.setImpactStrategique("Impact");
        request.setEstOuverte(true);
        request.setAutresInformations("Autres Infos");
        request.setPeriodCode(PeriodCode.P1);
        request.setCustomPeriodLabel("Custom Label");
        request.setCommentaire("Commentaire");
        request.setApprouveCUP(true);
        request.setApprouveChefDep(false);
        request.setApprouveAdmin(null);

        assertThat(request).extracting(
                BesoinFormationRequest::getIdBesoinFormation,
                BesoinFormationRequest::getUsername,
                BesoinFormationRequest::getTypeBesoin,
                BesoinFormationRequest::getTitre,
                BesoinFormationRequest::getObjectifFormation,
                BesoinFormationRequest::getNbMaxParticipants,
                BesoinFormationRequest::getDureeFormation,
                BesoinFormationRequest::getUp,
                BesoinFormationRequest::getDepartement,
                BesoinFormationRequest::getPriorite,
                BesoinFormationRequest::getPropositionAnimateur,
                BesoinFormationRequest::getPrerequis,
                BesoinFormationRequest::getPublicCible,
                BesoinFormationRequest::getProgrammeFormation,
                BesoinFormationRequest::getTheme,
                BesoinFormationRequest::getObjectifsOperationnels,
                BesoinFormationRequest::getObjectifsPedagogiques,
                BesoinFormationRequest::getMethodesPedagogiques,
                BesoinFormationRequest::getMoyensPedagogiques,
                BesoinFormationRequest::getMethodesEvaluationAcquis,
                BesoinFormationRequest::getProfilFormateur,
                BesoinFormationRequest::getHoraireSouhaite,
                BesoinFormationRequest::getImpactStrategique,
                BesoinFormationRequest::getEstOuverte,
                BesoinFormationRequest::getAutresInformations,
                BesoinFormationRequest::getPeriodCode,
                BesoinFormationRequest::getCustomPeriodLabel,
                BesoinFormationRequest::getCommentaire,
                BesoinFormationRequest::getApprouveCUP,
                BesoinFormationRequest::getApprouveChefDep,
                BesoinFormationRequest::getApprouveAdmin
        ).containsExactly(
                1L, "user1", TypeBesoin.COLLECTIF, "Titre", "Objectif", 20, 10, "UP1", "DEP1", Priorite.HAUTE,
                "Animateur", "Prerequis", "Public", "Programme", "Theme", "Objectifs Operationnels",
                "Objectifs Pedagogiques", "Methodes", "Moyens", "Evaluation", "Profil", "Horaire",
                "Impact", true, "Autres Infos", PeriodCode.P1, "Custom Label", "Commentaire", true, false, null
        );
    }

    @Test
    void testWithNullValues() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername(null);
        request.setTypeBesoin(null);
        request.setTitre(null);
        request.setPriorite(null);
        request.setPeriodCode(null);

        assertAll("Verify null values",
            () -> assertNull(request.getUsername()),
            () -> assertNull(request.getTypeBesoin()),
            () -> assertNull(request.getTitre()),
            () -> assertNull(request.getPriorite()),
            () -> assertNull(request.getPeriodCode())
        );
    }

    @Test
    void testWithEmptyStrings() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername("");
        request.setTitre("");
        request.setObjectifFormation("");

        assertAll("Verify empty strings",
            () -> assertEquals("", request.getUsername()),
            () -> assertEquals("", request.getTitre()),
            () -> assertEquals("", request.getObjectifFormation())
        );
    }

    @Test
    void testWithZeroValues() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setNbMaxParticipants(0);
        request.setDureeFormation(0);

        assertAll("Verify zero values",
            () -> assertEquals(0, request.getNbMaxParticipants()),
            () -> assertEquals(0, request.getDureeFormation())
        );
    }

    @Test
    void testWithBooleanValues() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setEstOuverte(true);
        request.setApprouveCUP(true);
        request.setApprouveChefDep(false);
        request.setApprouveAdmin(null);

        assertAll("Verify boolean values",
            () -> assertTrue(request.getEstOuverte()),
            () -> assertTrue(request.getApprouveCUP()),
            () -> assertFalse(request.getApprouveChefDep()),
            () -> assertNull(request.getApprouveAdmin())
        );
    }

    @Test
    void testAllEnums() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setPriorite(Priorite.HAUTE);
        request.setPeriodCode(PeriodCode.P1);

        assertAll("Verify enums",
            () -> assertEquals(TypeBesoin.COLLECTIF, request.getTypeBesoin()),
            () -> assertEquals(Priorite.HAUTE, request.getPriorite()),
            () -> assertEquals(PeriodCode.P1, request.getPeriodCode())
        );
    }

    @Test
    void testBuilderWithNullValues() {
        BesoinFormationRequest request = BesoinFormationRequest.builder()
                .username(null)
                .typeBesoin(null)
                .titre(null)
                .build();

        assertAll("Verify builder null values",
            () -> assertNull(request.getUsername()),
            () -> assertNull(request.getTypeBesoin()),
            () -> assertNull(request.getTitre())
        );
    }

    @Test
    void testBuilderWithPartialFields() {
        BesoinFormationRequest request = BesoinFormationRequest.builder()
                .username("user1")
                .titre("Titre")
                .build();

        assertAll("Verify builder partial fields",
            () -> assertEquals("user1", request.getUsername()),
            () -> assertEquals("Titre", request.getTitre()),
            () -> assertNull(request.getTypeBesoin()),
            () -> assertNull(request.getPriorite())
        );
    }
}
