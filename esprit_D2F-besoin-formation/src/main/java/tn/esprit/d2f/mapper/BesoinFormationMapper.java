package tn.esprit.d2f.mapper;

import org.springframework.stereotype.Component;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;

@Component
public class BesoinFormationMapper {

    public BesoinFormation toEntity(BesoinFormationRequest request) {
        if (request == null) return null;

        BesoinFormation entity = new BesoinFormation();
        entity.setUsername(request.getUsername());
        entity.setTypeBesoin(request.getTypeBesoin());
        entity.setTitre(request.getTitre());
        entity.setObjectifFormation(request.getObjectifFormation());
        entity.setNbMaxParticipants(request.getNbMaxParticipants());
        entity.setDureeFormation(request.getDureeFormation());
        entity.setUp(request.getUp());
        entity.setDepartement(request.getDepartement());
        entity.setPriorite(request.getPriorite());
        entity.setPropositionAnimateur(request.getPropositionAnimateur());
        entity.setPrerequis(request.getPrerequis());
        entity.setPublicCible(request.getPublicCible());
        entity.setProgrammeFormation(request.getProgrammeFormation());
        entity.setTheme(request.getTheme());
        entity.setObjectifsOperationnels(request.getObjectifsOperationnels());
        entity.setObjectifsPedagogiques(request.getObjectifsPedagogiques());
        entity.setMethodesPedagogiques(request.getMethodesPedagogiques());
        entity.setMoyensPedagogiques(request.getMoyensPedagogiques());
        entity.setMethodesEvaluationAcquis(request.getMethodesEvaluationAcquis());
        entity.setProfilFormateur(request.getProfilFormateur());
        entity.setHoraireSouhaite(request.getHoraireSouhaite());
        entity.setImpactStrategique(request.getImpactStrategique());
        entity.setEstOuverte(request.getEstOuverte());
        entity.setAutresInformations(request.getAutresInformations());
        entity.setPeriodCode(request.getPeriodCode());
        entity.setCustomPeriodLabel(request.getCustomPeriodLabel());
        entity.setDateDebut(request.getDateDebut());
        entity.setDateFin(request.getDateFin());

        return entity;
    }

    public BesoinFormationResponse toResponse(BesoinFormation entity) {
        if (entity == null) return null;

        return BesoinFormationResponse.builder()
                .idBesoinFormation(entity.getIdBesoinFormation())
                .username(entity.getUsername())
                .typeBesoin(entity.getTypeBesoin())
                .objectifFormation(entity.getObjectifFormation())
                .propositionAnimateur(entity.getPropositionAnimateur())
                .prerequis(entity.getPrerequis())
                .publicCible(entity.getPublicCible())
                .nbMaxParticipants(entity.getNbMaxParticipants())
                .programmeFormation(entity.getProgrammeFormation())
                .dureeFormation(entity.getDureeFormation())
                .titre(entity.getTitre())
                .theme(entity.getTheme())
                .objectifsOperationnels(entity.getObjectifsOperationnels())
                .objectifsPedagogiques(entity.getObjectifsPedagogiques())
                .methodesPedagogiques(entity.getMethodesPedagogiques())
                .moyensPedagogiques(entity.getMoyensPedagogiques())
                .methodesEvaluationAcquis(entity.getMethodesEvaluationAcquis())
                .profilFormateur(entity.getProfilFormateur())
                .horaireSouhaite(entity.getHoraireSouhaite())
                .up(entity.getUp())
                .departement(entity.getDepartement())
                .approuveCUP(entity.getApprouveCUP())
                .approuveChefDep(entity.getApprouveChefDep())
                .approuveAdmin(entity.getApprouveAdmin())
                .notificationMessage(entity.getNotificationMessage())
                .priorite(entity.getPriorite())
                .impactStrategique(entity.getImpactStrategique())
                .estOuverte(entity.getEstOuverte())
                .autresInformations(entity.getAutresInformations())
                .periodCode(entity.getPeriodCode())
                .customPeriodLabel(entity.getCustomPeriodLabel())
                .dateDebut(entity.getDateDebut())
                .dateFin(entity.getDateFin())
                .eventPublished(entity.getEventPublished())
                .build();
    }
}
