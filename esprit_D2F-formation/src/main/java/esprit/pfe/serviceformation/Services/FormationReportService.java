package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AnimateurFormationDTO;
import esprit.pfe.serviceformation.dto.FormateurNameDTO;
import esprit.pfe.serviceformation.dto.ParticipantFormationDTO;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FormationReportService {
    private final SeanceFormationRepository seanceRepo;
    private final PresenceRepository presenceRepo;

    /**
     * Récupère selon le rôle ("animateur" ou "participant")
     * la liste des formations pour un enseignant et une période données.
     */
    public List<Object> getFormationsParRoleEtPeriode(
            String role,
            String enseignantId,
            Date debutPeriode,
            Date finPeriode
    ) {
        if ("animateur".equalsIgnoreCase(role)) {
            return seanceRepo.findFormationsByAnimateurAndPeriod(
                            enseignantId, debutPeriode, finPeriode
                    ).stream()
                    .<Object>map(f -> new AnimateurFormationDTO(
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
                    .<Object>map(f -> {
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
