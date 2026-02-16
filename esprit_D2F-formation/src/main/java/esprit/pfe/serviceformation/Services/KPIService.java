package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.*;
import esprit.pfe.serviceformation.Entities.*;
import esprit.pfe.serviceformation.Repositories.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KPIService {

    private final FormationRepository formationRepository;
    private final PresenceRepository presenceRepository;
    private final UpRepository upRepository;
    private final DeptRepository deptRepository;

    private final EnseignantRepository enseignantRepository;

    // Fonction pour compter le nombre total de formations sur la période donnée
    public int countTotalFormations(Date start, Date end) {
        return formationRepository.countTotalFormations(start, end);
    }

    // Fonction pour calculer le total des heures de formation sur la période donnée
    public int calculateTotalHeures(Date start, Date end) {
        return formationRepository.sumTotalHeures(start, end);
    }

    // Fonction pour compter le nombre de participants uniques sur la période donnée
    public int countUniqueParticipants(Date start, Date end) {
        return formationRepository.countUniqueParticipants(start, end);
    }

    // Nouvelle fonction pour retourner le nombre de formations par état sur la période donnée
    public FormationsByEtatDTO getFormationsByEtat(Date start, Date end) {
        List<Object[]> results = formationRepository.countFormationsByEtat(start, end);
        FormationsByEtatDTO dto = new FormationsByEtatDTO();
        int total = 0;
        for (Object[] row : results) {
            // La première colonne contient l'enum et la deuxième le compte
            Enum etat = (Enum) row[0];
            Long count = (Long) row[1];
            total += count.intValue();

            switch (etat.name()) {
                case "ENREGISTRE":
                    dto.setEnregistre(count.intValue());
                    break;
                case "PLANIFIE":
                    dto.setPlanifie(count.intValue());
                    break;
                case "EN_COURS":
                    dto.setEnCours(count.intValue());
                    break;
                case "ACHEVE":
                    dto.setAcheve(count.intValue());
                    break;
                case "ANNULE":
                    dto.setAnnule(count.intValue());
                    break;
            }
        }
        dto.setTotal(total);
        return dto;
    }


    public List<EnseignantStatsDTO> getTopParticipants(
            String upId,
            String deptId,
            Date start,
            Date end
    ) {
        validateDates(start, end);
        validateFilters(upId, deptId);
        return presenceRepository.findTopParticipants(
                upId, deptId, start, end, EtatFormation.ACHEVE
        );
    }

    public List<EnseignantStatsDTO> getTopAbsentees(
            String upId,
            String deptId,
            Date start,
            Date end
    ) {
        validateDates(start, end);
        validateFilters(upId, deptId);
        return presenceRepository.findTopAbsentees(
                upId, deptId, start, end, EtatFormation.ACHEVE
        );
    }

    private void validateDates(Date start, Date end) {
        // On ne compare que si les deux dates sont renseignées
        if (start != null && end != null && start.after(end)) {
            throw new IllegalArgumentException(
                    "La date de début doit être antérieure ou égale à la date de fin."
            );
        }
    }


    private void validateFilters(String upId, String deptId) {
        if (upId != null && !upRepository.existsById(upId)) {
            throw new EntityNotFoundException("UP non trouvée pour l'id : " + upId);
        }
        if (deptId != null && !deptRepository.existsById(deptId)) {
            throw new EntityNotFoundException("Département non trouvé pour l'id : " + deptId);
        }
    }

    public List<EnseignantDTO> getEnseignantsNonAffectes(Date start, Date end) {
        return enseignantRepository
                .findEnseignantsNonAffectesSurPeriode(start, end)
                .stream()
                .map(this::mapEnseignantToDTO)
                .collect(Collectors.toList());
    }

    private EnseignantDTO mapEnseignantToDTO(Enseignant ens) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(ens.getId());
        dto.setNom(ens.getNom());
        dto.setPrenom(ens.getPrenom());
        dto.setMail(ens.getMail());
        dto.setType(ens.getType());

        // Mapping du département
        if (ens.getDept() != null) {
            dto.setDeptId(ens.getDept().getId());
            dto.setDeptLibelle(ens.getDept().getLibelle());
        }

        // Mapping de l'Unité Pédagogique
        if (ens.getUp() != null) {
            dto.setUpId(ens.getUp().getId());
            dto.setUpLibelle(ens.getUp().getLibelle());
        }

        return dto;
    }

    private List<EtatFormation> buildEtatList(String etatParam) {
        if (etatParam == null) {
            // Par défaut, on ne compte que PLANIFIE et ACHEVE
            return List.of(EtatFormation.PLANIFIE, EtatFormation.ACHEVE);
        }
        String cle = etatParam.trim().toUpperCase();
        return switch (cle) {
            case "PLANIFIE" -> List.of(EtatFormation.PLANIFIE);
            case "ACHEVE" -> List.of(EtatFormation.ACHEVE);
            case "TOUT" -> Arrays.asList(EtatFormation.values());
            default -> throw new IllegalArgumentException(
                    "Paramètre etat invalide : '" + etatParam +
                            "'. “PLANIFIE”, “ACHEVE” ou “TOUT” attendu."
            );
        };
    }

    /**
     * Méthode unique qui renvoie un DTO contenant :
     * - le nombre de formations qui correspondent aux filtres
     * - la somme des heures de ces mêmes formations
     */
    public CountHeuresDTO getCountAndSumHeures(
            String competence,
            String domaine,
            Long upId,
            Long deptId,
            Boolean ouverte,
            Date start,
            Date end,
            String etatParam
    ) {
        // 1) Construire la liste d'états
        List<EtatFormation> etats = buildEtatList(etatParam);

        // 2) Appeler le repository (cela lance la JPQL définie plus haut)
        return formationRepository.countAndSumHeuresWithFilters(
                competence, domaine, upId, deptId, ouverte, start, end, etats
        );
    }

    public FormationsByTypeDTO getFormationsByTypeWithFilters(
            String competence,
            String domaine,
            Long upId,
            Long deptId,
            Boolean ouverte,
            Date start,
            Date end,
            String etatParam
    ) {
        // 1) Construire la liste d'états valides
        List<EtatFormation> etats = buildEtatList(etatParam);

        // 2) Appel au repository pour récupérer List<Object[]> où
        //    row[0] = TypeFormation, row[1] = Long count
        List<Object[]> results =
                formationRepository.countFormationsByTypeWithFilters(
                        competence, domaine, upId, deptId, ouverte, start, end, etats
                );

        // 3) Initialiser le DTO à zéro
        FormationsByTypeDTO dto = new FormationsByTypeDTO(0L, 0L, 0L);

        // 4) Parcourir les résultats et remplir le DTO
        for (Object[] row : results) {
            TypeFormation type = (TypeFormation) row[0];
            Long count = (Long) row[1];

            switch (type) {
                case INTERNE:
                    dto.setInterne(count);
                    break;
                case EXTERNE:
                    dto.setExterne(count);
                    break;
                case EN_LIGNE:
                    dto.setEnLigne(count);
                    break;
                default:
                    // Normalement impossible, puisqu’on n’a que 3 valeurs dans l’enum.
                    break;
            }
        }

        return dto;
    }







    public CountByTrainerTypeWithIdsDTO getCountByTrainerTypeWithIds(
            String competence,
            String domaine,
            Long upId,
            Long deptId,
            Boolean ouverte,
            Date start,
            Date end,
            String etatParam
    ) {
        // 1) Valider dates / filtres
        validateDates(start, end);
        validateFilters(upId != null ? upId.toString() : null,
                deptId != null ? deptId.toString() : null);

        // 2) Construire la liste d’états
        List<EtatFormation> etats = buildEtatList(etatParam);

        // 3) Appeler les 3 méthodes du repository pour récupérer les **listes d’ID**
        List<Long> externeOnlyIds = formationRepository.findExterneOnlyIdsWithFilters(
                competence, domaine, upId, deptId, ouverte, start, end, etats
        );
        List<Long> interneOnlyIds = formationRepository.findInterneOnlyIdsWithFilters(
                competence, domaine, upId, deptId, ouverte, start, end, etats
        );
        List<Long> mixteIds = formationRepository.findMixteIdsWithFilters(
                competence, domaine, upId, deptId, ouverte, start, end, etats
        );

        // 4) Construire le DTO en passant à la fois les **counts** et les **IDs**
        Long externeCount = (externeOnlyIds == null ? 0L : (long) externeOnlyIds.size());
        Long interneCount = (interneOnlyIds == null ? 0L : (long) interneOnlyIds.size());
        Long mixteCount   = (mixteIds == null ? 0L : (long) mixteIds.size());

        return new CountByTrainerTypeWithIdsDTO(
                externeCount,
                interneCount,
                mixteCount,
                externeOnlyIds,
                interneOnlyIds,
                mixteIds
        );
    }
}


