package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.AnimateurFormationDTO;
import esprit.pfe.serviceformation.DTO.FormateurNameDTO;
import esprit.pfe.serviceformation.DTO.ParticipantFormationDTO;
import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Repositories.PresenceRepository;
import esprit.pfe.serviceformation.Repositories.SeanceFormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
public class FormationReportService {

    @Autowired
    private SeanceFormationRepository seanceRepo;

    @Autowired
    private PresenceRepository presenceRepo;

    /**
     * Récupère selon le rôle ("animateur" ou "participant")
     * la liste des formations pour un enseignant et une période données.
     */
    public List<?> getFormationsParRoleEtPeriode(
            String role,
            String enseignantId,
            Date debutPeriode,
            Date finPeriode
    ) {
        if ("animateur".equalsIgnoreCase(role)) {
            return seanceRepo.findFormationsByAnimateurAndPeriod(
                            enseignantId, debutPeriode, finPeriode
                    ).stream()
                    .map(f -> new AnimateurFormationDTO(
                            f.getTitreFormation(),
                            f.getPopulationCible(),
                            f.getObjectifs(),
                            f.getChargeHoraireGlobal(),
                            f.getDateDebut(),
                            f.getDateFin()
                    ))
                    .toList();
        }
        else if ("participant".equalsIgnoreCase(role)) {
            return presenceRepo.findFormationsByParticipantAndPeriod(
                            enseignantId, debutPeriode, finPeriode
                    ).stream()
                    .map(f -> {
                        List<FormateurNameDTO> formateurs = seanceRepo
                                .findAnimateursByFormation(f.getIdFormation())
                                .stream()
                                .map(e -> new FormateurNameDTO(e.getNom(), e.getPrenom()))
                                .toList();
                        return new ParticipantFormationDTO(
                                f.getTitreFormation(),
                                formateurs,
                                f.getDateDebut(),
                                f.getDateFin()
                        );
                    })
                    .toList();
        }
        else {
            throw new IllegalArgumentException("Rôle invalide : " + role);
        }
    }
}
