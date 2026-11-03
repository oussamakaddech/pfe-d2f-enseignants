package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AnimateurFormationDTO;
import esprit.pfe.serviceformation.dto.FormateurNameDTO;
import esprit.pfe.serviceformation.dto.ParticipantFormationDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class FormationReportService {
    private final SeanceFormationRepository seanceRepo;
    private final PresenceRepository presenceRepo;
    private final FormationRepository formationRepo;
    private final EnseignantRepository enseignantRepo;

    /**
     * Récupère selon le rôle ("animateur" ou "participant")
     * la liste des formations pour un enseignant et une période données.
     * <p>
     * Le périmètre ne dépend plus de l'existence de séances ou de présences :
     * une formation « Enregistrée » (sans séance) reste donc proposée. Pour
     * l'animateur : affectation au niveau formation ou à une séance. Pour le
     * participant : inscription, affectation à une séance, présence ou e-mail
     * de participant rattaché à la formation.
     */
    @Transactional(readOnly = true)
    public List<Object> getFormationsParRoleEtPeriode(
            String role,
            String enseignantId,
            LocalDate debutPeriode,
            LocalDate finPeriode
    ) {
        if ("animateur".equalsIgnoreCase(role)) {
            Map<Long, Formation> formations = new LinkedHashMap<>();
            collect(formations, seanceRepo.findFormationsByAnimateurAndPeriod(
                    enseignantId, debutPeriode, finPeriode));
            collect(formations, formationRepo.findFormationsByAnimateurAndPeriod(
                    enseignantId, debutPeriode, finPeriode, EtatFormation.ANNULE));
            return formations.values().stream()
                    .filter(f -> f.getEtatFormation() != EtatFormation.ANNULE)
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
            Map<Long, Formation> formations = new LinkedHashMap<>();
            collect(formations, presenceRepo.findFormationsByParticipantAndPeriod(
                    enseignantId, debutPeriode, finPeriode));
            collect(formations, seanceRepo.findFormationsBySeanceParticipantAndPeriod(
                    enseignantId, debutPeriode, finPeriode));
            collect(formations, formationRepo.findFormationsByInscriptionAndPeriod(
                    enseignantId, debutPeriode, finPeriode, EtatFormation.ANNULE));
            String mail = enseignantRepo.findById(enseignantId)
                    .map(Enseignant::getMail)
                    .filter(m -> m != null && !m.isBlank())
                    .orElse(null);
            if (mail != null) {
                collect(formations, formationRepo.findFormationsByParticipantEmailAndPeriod(
                        mail, debutPeriode, finPeriode, EtatFormation.ANNULE));
            }
            return formations.values().stream()
                    .filter(f -> f.getEtatFormation() != EtatFormation.ANNULE)
                    .<Object>map(f -> new ParticipantFormationDTO(
                            f.getTitreFormation(),
                            formateursOf(f),
                            f.getDateDebut(),
                            f.getDateFin()
                    ))
                    .toList();
        }
        else {
            throw new IllegalArgumentException("Rôle invalide : " + role);
        }
    }

    /** Fusion sans doublon (par identifiant de formation), ordre de première apparition conservé. */
    private void collect(Map<Long, Formation> target, List<Formation> found) {
        if (found == null) {
            return;
        }
        for (Formation f : found) {
            if (f != null && f.getIdFormation() != null) {
                target.putIfAbsent(f.getIdFormation(), f);
            }
        }
    }

    /** Formateurs de la formation : animateurs de séance puis animateurs portés par la formation. */
    private List<FormateurNameDTO> formateursOf(Formation formation) {
        Map<String, FormateurNameDTO> unique = new LinkedHashMap<>();
        seanceRepo.findAnimateursByFormation(formation.getIdFormation()).stream()
                .filter(Objects::nonNull)
                .forEach(e -> unique.putIfAbsent(e.getId(),
                        new FormateurNameDTO(e.getNom(), e.getPrenom())));
        if (formation.getAnimateurs() != null) {
            formation.getAnimateurs().stream()
                    .filter(Objects::nonNull)
                    .forEach(e -> unique.putIfAbsent(e.getId(),
                            new FormateurNameDTO(e.getNom(), e.getPrenom())));
        }
        return List.copyOf(unique.values());
    }
}
