package tn.esprit.d2f.mapper;

import org.springframework.stereotype.Component;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;

/**
 * Mapper manuel BesoinFormation ↔ DTO.
 *
 * <p>Fix 8 — Gère la conversion {@code LocalDate → String} pour les champs
 * {@code dateDebut} / {@code dateFin} (le Request DTO utilise désormais {@code LocalDate}
 * pour permettre la validation {@code @Future}, tandis que l'entité stocke une chaîne VARCHAR).</p>
 *
 * <p>Fix 6 — Les champs d'audit ({@code createdAt}, {@code updatedAt}, {@code createdBy},
 * {@code updatedBy}) sont inclus dans la réponse pour la traçabilité.</p>
 */
@Component
public class BesoinFormationMapper {

    /**
     * Convertit un {@link BesoinFormationRequest} en entité JPA.
     * Le champ {@code dateDebut}/{@code dateFin} est converti de {@code LocalDate} → {@code String} ISO.
     */
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
        entity.setAnimateurs(request.getAnimateurs());
        entity.setEnseignants(request.getEnseignants());
        entity.setPeriodCode(request.getPeriodCode());
        entity.setCustomPeriodLabel(request.getCustomPeriodLabel());
        // Fix 8: LocalDate → String (entité stocke en VARCHAR "yyyy-MM-dd")
        entity.setDateDebut(request.getDateDebut() != null ? request.getDateDebut().toString() : null);
        entity.setDateFin(request.getDateFin() != null ? request.getDateFin().toString() : null);

        return entity;
    }

    /**
     * Convertit une entité {@link BesoinFormation} en {@link BesoinFormationResponse}.
     * Inclut les champs d'audit hérités de {@code BaseAuditEntity} (Fix 6).
     */
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
                .animateurs(entity.getAnimateurs())
                .enseignants(entity.getEnseignants())
                .periodCode(entity.getPeriodCode())
                .customPeriodLabel(entity.getCustomPeriodLabel())
                .dateDebut(entity.getDateDebut())
                .dateFin(entity.getDateFin())
                .eventPublished(entity.getEventPublished())
                // Fix 6 — Champs d'audit (traçabilité)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
