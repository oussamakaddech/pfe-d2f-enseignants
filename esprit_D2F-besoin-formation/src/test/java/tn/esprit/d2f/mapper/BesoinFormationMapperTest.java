package tn.esprit.d2f.mapper;

import org.junit.jupiter.api.Test;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;
import tn.esprit.d2f.entity.enumerations.PeriodCode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

class BesoinFormationMapperTest {

    private final BesoinFormationMapper mapper = new BesoinFormationMapper();

    @Test
    void toEntity_shouldMapAllFields() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername("user1");
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
        request.setTitre("Titre");
        request.setObjectifFormation("Objectif");
        request.setNbMaxParticipants(10);
        request.setDureeFormation(5);
        request.setTheme("Theme");
        request.setUp("UP1");
        request.setDepartement("DEP1");
        request.setPriorite(Priorite.HAUTE);
        request.setPropositionAnimateur("Animateur");
        request.setPrerequis("Prerequis");
        request.setPublicCible("Public");
        request.setProgrammeFormation("Programme");
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

        BesoinFormation entity = mapper.toEntity(request);

        assertNotNull(entity);
        assertThat(entity).extracting(
                BesoinFormation::getUsername,
                BesoinFormation::getTypeBesoin,
                BesoinFormation::getTitre,
                BesoinFormation::getObjectifFormation,
                BesoinFormation::getNbMaxParticipants,
                BesoinFormation::getDureeFormation,
                BesoinFormation::getTheme,
                BesoinFormation::getUp,
                BesoinFormation::getDepartement,
                BesoinFormation::getPriorite,
                BesoinFormation::getPropositionAnimateur,
                BesoinFormation::getPrerequis,
                BesoinFormation::getPublicCible,
                BesoinFormation::getProgrammeFormation,
                BesoinFormation::getObjectifsOperationnels,
                BesoinFormation::getObjectifsPedagogiques,
                BesoinFormation::getMethodesPedagogiques,
                BesoinFormation::getMoyensPedagogiques,
                BesoinFormation::getMethodesEvaluationAcquis,
                BesoinFormation::getProfilFormateur,
                BesoinFormation::getHoraireSouhaite,
                BesoinFormation::getImpactStrategique,
                BesoinFormation::getEstOuverte,
                BesoinFormation::getAutresInformations,
                BesoinFormation::getPeriodCode,
                BesoinFormation::getCustomPeriodLabel
        ).containsExactly(
                "user1", TypeBesoin.COLLECTIF, "Titre", "Objectif", 10, 5, "Theme", "UP1", "DEP1", Priorite.HAUTE,
                "Animateur", "Prerequis", "Public", "Programme", "Objectifs Operationnels",
                "Objectifs Pedagogiques", "Methodes", "Moyens", "Evaluation", "Profil", "Horaire",
                "Impact", true, "Autres Infos", PeriodCode.P1, "Custom Label"
        );
    }

    @Test
    void toEntity_null_shouldReturnNull() {
        assertNull(mapper.toEntity(null));
    }

    @Test
    void toEntity_withNullFields_shouldMapNonNullFields() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername("user1");
        request.setTitre("Titre");
        
        BesoinFormation entity = mapper.toEntity(request);
        
        assertNotNull(entity);
        assertAll("Verify null fields",
            () -> assertEquals("user1", entity.getUsername()),
            () -> assertEquals("Titre", entity.getTitre()),
            () -> assertNull(entity.getTypeBesoin()),
            () -> assertNull(entity.getPriorite())
        );
    }

    @Test
    void toEntity_withEmptyStrings_shouldMapEmptyStrings() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername("");
        request.setTitre("");
        request.setObjectifFormation("");
        
        BesoinFormation entity = mapper.toEntity(request);
        
        assertNotNull(entity);
        assertAll("Verify empty strings",
            () -> assertEquals("", entity.getUsername()),
            () -> assertEquals("", entity.getTitre()),
            () -> assertEquals("", entity.getObjectifFormation())
        );
    }

    @Test
    void toEntity_withZeroValues_shouldMapZeroValues() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setNbMaxParticipants(0);
        request.setDureeFormation(0);
        
        BesoinFormation entity = mapper.toEntity(request);
        
        assertNotNull(entity);
        assertAll("Verify zero values",
            () -> assertEquals(0, entity.getNbMaxParticipants()),
            () -> assertEquals(0, entity.getDureeFormation())
        );
    }

    @Test
    void toEntity_withBooleanValues_shouldMapBooleanValues() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setEstOuverte(true);
        
        BesoinFormation entity = mapper.toEntity(request);
        
        assertNotNull(entity);
        assertAll("Verify boolean values",
            () -> assertTrue(entity.getEstOuverte()),
            () -> assertNull(entity.getApprouveCUP()),
            () -> assertNull(entity.getApprouveChefDep()),
            () -> assertNull(entity.getApprouveAdmin())
        );
    }

    @Test
    void toResponse_shouldMapAllFields() {
        BesoinFormation entity = new BesoinFormation();
        entity.setIdBesoinFormation(1L);
        entity.setUsername("user1");
        entity.setTitre("Titre");
        entity.setObjectifFormation("Objectif");
        entity.setApprouveAdmin(true);
        entity.setApprouveCUP(false);
        entity.setApprouveChefDep(true);
        entity.setNbMaxParticipants(20);
        entity.setDureeFormation(10);
        entity.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        entity.setPriorite(Priorite.MOYENNE);
        entity.setPropositionAnimateur("Animateur");
        entity.setPrerequis("Prerequis");
        entity.setPublicCible("Public");
        entity.setProgrammeFormation("Programme");
        entity.setTheme("Theme");
        entity.setObjectifsOperationnels("Objectifs Operationnels");
        entity.setObjectifsPedagogiques("Objectifs Pedagogiques");
        entity.setMethodesPedagogiques("Methodes");
        entity.setMoyensPedagogiques("Moyens");
        entity.setMethodesEvaluationAcquis("Evaluation");
        entity.setProfilFormateur("Profil");
        entity.setHoraireSouhaite("Horaire");
        entity.setUp("UP1");
        entity.setDepartement("DEP1");
        entity.setImpactStrategique("Impact");
        entity.setEstOuverte(true);
        entity.setAutresInformations("Autres Infos");
        entity.setPeriodCode(PeriodCode.P2);
        entity.setCustomPeriodLabel("Custom Label");
        entity.setEventPublished(true);
        entity.setNotificationMessage("Notification");

        BesoinFormationResponse response = mapper.toResponse(entity);

        assertNotNull(response);
        assertThat(response).extracting(
                BesoinFormationResponse::getIdBesoinFormation,
                BesoinFormationResponse::getUsername,
                BesoinFormationResponse::getTitre,
                BesoinFormationResponse::getObjectifFormation,
                BesoinFormationResponse::getApprouveAdmin,
                BesoinFormationResponse::getApprouveCUP,
                BesoinFormationResponse::getApprouveChefDep,
                BesoinFormationResponse::getNbMaxParticipants,
                BesoinFormationResponse::getDureeFormation,
                BesoinFormationResponse::getTypeBesoin,
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
                BesoinFormationResponse::getUp,
                BesoinFormationResponse::getDepartement,
                BesoinFormationResponse::getImpactStrategique,
                BesoinFormationResponse::getEstOuverte,
                BesoinFormationResponse::getAutresInformations,
                BesoinFormationResponse::getPeriodCode,
                BesoinFormationResponse::getCustomPeriodLabel,
                BesoinFormationResponse::getEventPublished,
                BesoinFormationResponse::getNotificationMessage
        ).containsExactly(
                1L, "user1", "Titre", "Objectif", true, false, true, 20, 10, TypeBesoin.INDIVIDUEL, Priorite.MOYENNE,
                "Animateur", "Prerequis", "Public", "Programme", "Theme", "Objectifs Operationnels",
                "Objectifs Pedagogiques", "Methodes", "Moyens", "Evaluation", "Profil", "Horaire",
                "UP1", "DEP1", "Impact", true, "Autres Infos", PeriodCode.P2, "Custom Label", true, "Notification"
        );
    }

    @Test
    void toResponse_null_shouldReturnNull() {
        assertNull(mapper.toResponse(null));
    }

    @Test
    void toResponse_withNullFields_shouldMapNonNullFields() {
        BesoinFormation entity = new BesoinFormation();
        entity.setIdBesoinFormation(1L);
        entity.setUsername("user1");
        entity.setTitre("Titre");
        entity.setNbMaxParticipants(0);
        entity.setDureeFormation(0);
        
        BesoinFormationResponse response = mapper.toResponse(entity);
        
        assertNotNull(response);
        assertAll("Verify partial null fields",
            () -> assertEquals(1L, response.getIdBesoinFormation()),
            () -> assertEquals("user1", response.getUsername()),
            () -> assertEquals("Titre", response.getTitre()),
            () -> assertNull(response.getTypeBesoin()),
            () -> assertNull(response.getPriorite()),
            () -> assertNull(response.getApprouveAdmin())
        );
    }

    @Test
    void toResponse_withEmptyStrings_shouldMapEmptyStrings() {
        BesoinFormation entity = new BesoinFormation();
        entity.setIdBesoinFormation(1L);
        entity.setUsername("");
        entity.setTitre("");
        entity.setObjectifFormation("");
        entity.setNbMaxParticipants(0);
        entity.setDureeFormation(0);
        
        BesoinFormationResponse response = mapper.toResponse(entity);
        
        assertNotNull(response);
        assertAll("Verify empty strings",
            () -> assertEquals(1L, response.getIdBesoinFormation()),
            () -> assertEquals("", response.getUsername()),
            () -> assertEquals("", response.getTitre()),
            () -> assertEquals("", response.getObjectifFormation())
        );
    }

    @Test
    void toResponse_withZeroValues_shouldMapZeroValues() {
        BesoinFormation entity = new BesoinFormation();
        entity.setIdBesoinFormation(1L);
        entity.setNbMaxParticipants(0);
        entity.setDureeFormation(0);
        
        BesoinFormationResponse response = mapper.toResponse(entity);
        
        assertNotNull(response);
        assertAll("Verify zero values",
            () -> assertEquals(1L, response.getIdBesoinFormation()),
            () -> assertEquals(0, response.getNbMaxParticipants()),
            () -> assertEquals(0, response.getDureeFormation())
        );
    }

    @Test
    void toResponse_withBooleanValues_shouldMapBooleanValues() {
        BesoinFormation entity = new BesoinFormation();
        entity.setIdBesoinFormation(1L);
        entity.setEstOuverte(true);
        entity.setApprouveCUP(true);
        entity.setApprouveChefDep(false);
        entity.setApprouveAdmin(null);
        entity.setEventPublished(false);
        entity.setNbMaxParticipants(0);
        entity.setDureeFormation(0);
        
        BesoinFormationResponse response = mapper.toResponse(entity);
        
        assertNotNull(response);
        assertAll("Verify boolean values",
            () -> assertEquals(1L, response.getIdBesoinFormation()),
            () -> assertTrue(response.getEstOuverte()),
            () -> assertTrue(response.getApprouveCUP()),
            () -> assertFalse(response.getApprouveChefDep()),
            () -> assertNull(response.getApprouveAdmin()),
            () -> assertFalse(response.getEventPublished())
        );
    }

    @Test
    void toEntity_toResponse_roundTrip_shouldPreserveData() {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername("user1");
        request.setTitre("Titre");
        request.setObjectifFormation("Objectif");
        request.setNbMaxParticipants(10);
        request.setDureeFormation(5);
        request.setTypeBesoin(TypeBesoin.COLLECTIF);
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
        request.setUp("UP1");
        request.setDepartement("DEP1");
        request.setImpactStrategique("Impact");
        request.setEstOuverte(true);
        request.setAutresInformations("Autres Infos");
        request.setPeriodCode(PeriodCode.P1);
        request.setCustomPeriodLabel("Custom Label");
        request.setApprouveCUP(true);
        request.setApprouveChefDep(false);
        request.setApprouveAdmin(null);

        BesoinFormation entity = mapper.toEntity(request);
        entity.setIdBesoinFormation(1L);
        BesoinFormationResponse response = mapper.toResponse(entity);

        assertThat(response).extracting(
                BesoinFormationResponse::getUsername,
                BesoinFormationResponse::getTitre,
                BesoinFormationResponse::getObjectifFormation,
                BesoinFormationResponse::getNbMaxParticipants,
                BesoinFormationResponse::getDureeFormation,
                BesoinFormationResponse::getTypeBesoin,
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
                BesoinFormationResponse::getUp,
                BesoinFormationResponse::getDepartement,
                BesoinFormationResponse::getImpactStrategique,
                BesoinFormationResponse::getEstOuverte,
                BesoinFormationResponse::getAutresInformations,
                BesoinFormationResponse::getPeriodCode,
                BesoinFormationResponse::getCustomPeriodLabel,
                BesoinFormationResponse::getApprouveCUP,
                BesoinFormationResponse::getApprouveChefDep,
                BesoinFormationResponse::getApprouveAdmin
        ).containsExactly(
                request.getUsername(), request.getTitre(), request.getObjectifFormation(),
                request.getNbMaxParticipants(), request.getDureeFormation(),
                request.getTypeBesoin(), request.getPriorite(),
                request.getPropositionAnimateur(), request.getPrerequis(),
                request.getPublicCible(), request.getProgrammeFormation(),
                request.getTheme(), request.getObjectifsOperationnels(),
                request.getObjectifsPedagogiques(), request.getMethodesPedagogiques(),
                request.getMoyensPedagogiques(), request.getMethodesEvaluationAcquis(),
                request.getProfilFormateur(), request.getHoraireSouhaite(),
                request.getUp(), request.getDepartement(),
                request.getImpactStrategique(), request.getEstOuverte(),
                request.getAutresInformations(), request.getPeriodCode(),
                request.getCustomPeriodLabel(), null, null, null
        );
    }
}
