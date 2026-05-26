package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.Formation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.stream.Collectors;

/**
 * Mapper for converting Formation entities to DTOs and vice versa.
 * Responsible for data transformation between API layer and service layer.
 */
@Component
@Slf4j
public class FormationMapper {

    /**
     * Convert Creation Request to Formation Entity
     */
    public Formation toEntity(CreateFormationRequest request) {
        if (request == null) {
            return null;
        }

        Formation formation = new Formation();
        formation.setTitreFormation(request.getTitreFormation());
        formation.setTypeFormation(request.getTypeFormation() != null ?
            request.getTypeFormation().equals("INTERNE") ?
                esprit.pfe.serviceformation.entities.TypeFormation.INTERNE :
                request.getTypeFormation().equals("EXTERNE") ?
                    esprit.pfe.serviceformation.entities.TypeFormation.EXTERNE :
                    esprit.pfe.serviceformation.entities.TypeFormation.MIXTE
            : null);

        formation.setEtatFormation(request.getEtatFormation() != null ?
            esprit.pfe.serviceformation.entities.EtatFormation.valueOf(request.getEtatFormation())
            : null);

        // Convert LocalDate to Date
        if (request.getDateDebut() != null) {
            formation.setDateDebut(java.sql.Date.valueOf(request.getDateDebut()));
        }
        if (request.getDateFin() != null) {
            formation.setDateFin(java.sql.Date.valueOf(request.getDateFin()));
        }

        formation.setChargeHoraireGlobal(request.getChargeHoraireGlobal());
        formation.setObjectifs(request.getObjectifs());
        formation.setObjectifsPedago(request.getObjectifsPedago());
        formation.setEvalMethods(request.getEvalMethods());
        formation.setCoutFormation(request.getCoutFormation());
        formation.setCoutTransport(request.getCoutTransport());
        formation.setCoutHebergement(request.getCoutHebergement());
        formation.setCoutRepas(request.getCoutRepas());
        formation.setDomaine(request.getDomaine());
        formation.setCompetence(request.getCompetence());
        formation.setPopulationCible(request.getPopulationCible());
        formation.setPrerequis(request.getPrerequis());
        formation.setAcquis(request.getAcquis());
        formation.setIndicateurs(request.getIndicateurs());
        formation.setExterneFormateurNom(request.getExterneFormateurNom());
        formation.setExterneFormateurPrenom(request.getExterneFormateurPrenom());
        formation.setExterneFormateurEmail(request.getExterneFormateurEmail());
        formation.setOrganismeRefExterne(request.getOrganismeRefExterne());
        formation.setBureauFormationNom(request.getBureauFormationNom());
        formation.setBureauFormationMail(request.getBureauFormationMail());
        formation.setBureauFormationTelephone(request.getBureauFormationTelephone());
        formation.setSalle(request.getSalle());
        formation.setPeriodCode(request.getPeriodCode() != null ?
            esprit.pfe.serviceformation.entities.PeriodCode.valueOf(request.getPeriodCode())
            : null);
        formation.setCustomPeriodLabel(request.getCustomPeriodLabel());

        return formation;
    }

    /**
     * Convert Update Request to Formation Entity (partial update)
     */
    public void updateEntityFromRequest(UpdateFormationRequest request, Formation formation) {
        if (request == null || formation == null) {
            return;
        }

        if (request.getTitreFormation() != null) {
            formation.setTitreFormation(request.getTitreFormation());
        }
        if (request.getTypeFormation() != null) {
            formation.setTypeFormation(esprit.pfe.serviceformation.entities.TypeFormation.valueOf(request.getTypeFormation()));
        }
        if (request.getEtatFormation() != null) {
            formation.setEtatFormation(esprit.pfe.serviceformation.entities.EtatFormation.valueOf(request.getEtatFormation()));
        }
        if (request.getDateDebut() != null) {
            formation.setDateDebut(java.sql.Date.valueOf(request.getDateDebut()));
        }
        if (request.getDateFin() != null) {
            formation.setDateFin(java.sql.Date.valueOf(request.getDateFin()));
        }
        if (request.getChargeHoraireGlobal() != null) {
            formation.setChargeHoraireGlobal(request.getChargeHoraireGlobal());
        }
        if (request.getObjectifs() != null) {
            formation.setObjectifs(request.getObjectifs());
        }
        if (request.getObjectifsPedago() != null) {
            formation.setObjectifsPedago(request.getObjectifsPedago());
        }
        if (request.getEvalMethods() != null) {
            formation.setEvalMethods(request.getEvalMethods());
        }
        if (request.getCoutFormation() != null) {
            formation.setCoutFormation(request.getCoutFormation());
        }
        if (request.getCoutTransport() != null) {
            formation.setCoutTransport(request.getCoutTransport());
        }
        if (request.getCoutHebergement() != null) {
            formation.setCoutHebergement(request.getCoutHebergement());
        }
        if (request.getCoutRepas() != null) {
            formation.setCoutRepas(request.getCoutRepas());
        }
        if (request.getDomaine() != null) {
            formation.setDomaine(request.getDomaine());
        }
        if (request.getCompetence() != null) {
            formation.setCompetence(request.getCompetence());
        }
        if (request.getPopulationCible() != null) {
            formation.setPopulationCible(request.getPopulationCible());
        }
        if (request.getPrerequis() != null) {
            formation.setPrerequis(request.getPrerequis());
        }
        if (request.getAcquis() != null) {
            formation.setAcquis(request.getAcquis());
        }
        if (request.getIndicateurs() != null) {
            formation.setIndicateurs(request.getIndicateurs());
        }
        if (request.getExterneFormateurNom() != null) {
            formation.setExterneFormateurNom(request.getExterneFormateurNom());
        }
        if (request.getExterneFormateurPrenom() != null) {
            formation.setExterneFormateurPrenom(request.getExterneFormateurPrenom());
        }
        if (request.getExterneFormateurEmail() != null) {
            formation.setExterneFormateurEmail(request.getExterneFormateurEmail());
        }
        if (request.getOrganismeRefExterne() != null) {
            formation.setOrganismeRefExterne(request.getOrganismeRefExterne());
        }
        if (request.getBureauFormationNom() != null) {
            formation.setBureauFormationNom(request.getBureauFormationNom());
        }
        if (request.getBureauFormationMail() != null) {
            formation.setBureauFormationMail(request.getBureauFormationMail());
        }
        if (request.getBureauFormationTelephone() != null) {
            formation.setBureauFormationTelephone(request.getBureauFormationTelephone());
        }
        if (request.getSalle() != null) {
            formation.setSalle(request.getSalle());
        }
        if (request.getPeriodCode() != null) {
            formation.setPeriodCode(esprit.pfe.serviceformation.entities.PeriodCode.valueOf(request.getPeriodCode()));
        }
        if (request.getCustomPeriodLabel() != null) {
            formation.setCustomPeriodLabel(request.getCustomPeriodLabel());
        }
    }

    /**
     * Convert Formation Entity to Response DTO
     */
    public FormationResponseDTO toResponseDTO(Formation formation) {
        if (formation == null) {
            return null;
        }

        LocalDate dateDebut = formation.getDateDebut() != null ?
            formation.getDateDebut().toInstant().atZone(ZoneId.systemDefault()).toLocalDate()
            : null;
        LocalDate dateFin = formation.getDateFin() != null ?
            formation.getDateFin().toInstant().atZone(ZoneId.systemDefault()).toLocalDate()
            : null;

        return FormationResponseDTO.builder()
            .idFormation(formation.getIdFormation())
            .titreFormation(formation.getTitreFormation())
            .typeFormation(formation.getTypeFormation() != null ? formation.getTypeFormation().toString() : null)
            .etatFormation(formation.getEtatFormation() != null ? formation.getEtatFormation().toString() : null)
            .dateDebut(dateDebut)
            .dateFin(dateFin)
            .chargeHoraireGlobal(formation.getChargeHoraireGlobal())
            .objectifs(formation.getObjectifs())
            .objectifsPedago(formation.getObjectifsPedago())
            .evalMethods(formation.getEvalMethods())
            .coutFormation(formation.getCoutFormation())
            .coutTransport(formation.getCoutTransport())
            .coutHebergement(formation.getCoutHebergement())
            .coutRepas(formation.getCoutRepas())
            .domaine(formation.getDomaine())
            .competence(formation.getCompetence())
            .populationCible(formation.getPopulationCible())
            .prerequis(formation.getPrerequis())
            .acquis(formation.getAcquis())
            .indicateurs(formation.getIndicateurs())
            .externeFormateurNom(formation.getExterneFormateurNom())
            .externeFormateurPrenom(formation.getExterneFormateurPrenom())
            .externeFormateurEmail(formation.getExterneFormateurEmail())
            .organismeRefExterne(formation.getOrganismeRefExterne())
            .bureauFormationNom(formation.getBureauFormationNom())
            .bureauFormationMail(formation.getBureauFormationMail())
            .bureauFormationTelephone(formation.getBureauFormationTelephone())
            .salle(formation.getSalle())
            .periodCode(formation.getPeriodCode() != null ? formation.getPeriodCode().toString() : null)
            .customPeriodLabel(formation.getCustomPeriodLabel())
            .ouverte(formation.isOuverte())
            .inscriptionsOuvertes(formation.isInscriptionsOuvertes())
            .certifGenerated(formation.isCertifGenerated())
            .up(formation.getUp() != null ? new UpDTO(formation.getUp().getId(), formation.getUp().getLibelle()) : null)
            .departement(formation.getDepartement() != null ?
                new DeptDTO(formation.getDepartement().getId(), formation.getDepartement().getNom())
                : null)
            .seances(formation.getSeances() != null ?
                formation.getSeances().stream().map(s -> SeanceDTO.builder()
                    .idSeance(s.getIdSeance())
                    .dateSeance(s.getDateSeance())
                    .heureDebut(s.getHeureDebut())
                    .heureFin(s.getHeureFin())
                    .build()).collect(Collectors.toList())
                : null)
            .createdAt(formation.getCreatedAt())
            .updatedAt(formation.getUpdatedAt())
            .createdBy(formation.getCreatedBy())
            .updatedBy(formation.getUpdatedBy())
            .build();
    }
}
