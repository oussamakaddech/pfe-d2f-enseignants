package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class KPIService {

    private final FormationRepository formationRepository;
    private final PresenceRepository presenceRepository;
    private final UpRepository upRepository;
    private final DeptRepository deptRepository;
    private final EnseignantRepository enseignantRepository;

    public int countTotalFormations(Date start, Date end) {
        return formationRepository.countTotalFormations(start, end);
    }

    public int calculateTotalHeures(Date start, Date end) {
        return formationRepository.sumTotalHeures(start, end);
    }

    public int countUniqueParticipants(Date start, Date end) {
        return formationRepository.countUniqueParticipants(start, end);
    }

    public FormationsByEtatDTO getFormationsByEtat(Date start, Date end) {
        List<Object[]> results = formationRepository.countFormationsByEtat(start, end);
        FormationsByEtatDTO dto = new FormationsByEtatDTO();
        int total = 0;
        for (Object[] row : results) {
            Enum<?> etat = (Enum<?>) row[0];
            Long count = (Long) row[1];
            total += count.intValue();

            switch (etat.name()) {
                case "ENREGISTRE" -> dto.setEnregistre(count.intValue());
                case "PLANIFIE" -> dto.setPlanifie(count.intValue());
                case "EN_COURS" -> dto.setEnCours(count.intValue());
                case "ACHEVE" -> dto.setAcheve(count.intValue());
                case "ANNULE" -> dto.setAnnule(count.intValue());
                default -> {}
            }
        }
        dto.setTotal(total);
        return dto;
    }

    public List<EnseignantStatsDTO> getTopParticipants(String upId, String deptId, Date start, Date end) {
        validateDates(start, end);
        validateFilters(upId, deptId);
        return presenceRepository.findTopParticipants(upId, deptId, start, end, EtatFormation.ACHEVE);
    }

    public List<EnseignantStatsDTO> getTopAbsentees(String upId, String deptId, Date start, Date end) {
        validateDates(start, end);
        validateFilters(upId, deptId);
        return presenceRepository.findTopAbsentees(upId, deptId, start, end, EtatFormation.ACHEVE);
    }

    public List<EnseignantDTO> getEnseignantsNonAffectes(Date start, Date end) {
        return enseignantRepository.findEnseignantsNonAffectesSurPeriode(start, end)
                .stream()
                .map(this::mapEnseignantToDTO)
                .toList();
    }

    public CountHeuresDTO getCountAndSumHeures(FormationFilter filter, String etatParam) {
        filter.setEtats(buildEtatList(etatParam));
        return formationRepository.countAndSumHeuresWithFilters(filter);
    }

    public FormationsByTypeDTO getFormationsByTypeWithFilters(FormationFilter filter, String etatParam) {
        filter.setEtats(buildEtatList(etatParam));
        List<Object[]> results = formationRepository.countFormationsByTypeWithFilters(filter);
        FormationsByTypeDTO dto = new FormationsByTypeDTO(0L, 0L, 0L);

        for (Object[] row : results) {
            TypeFormation type = (TypeFormation) row[0];
            Long count = (Long) row[1];
            switch (type) {
                case INTERNE -> dto.setInterne(count);
                case EXTERNE -> dto.setExterne(count);
                case EN_LIGNE -> dto.setEnLigne(count);
                default -> {}
            }
        }
        return dto;
    }

    public CountByTrainerTypeWithIdsDTO getCountByTrainerTypeWithIds(FormationFilter filter, String etatParam) {
        validateDates(filter.getStart(), filter.getEnd());
        validateFilters(filter.getUpId() != null ? filter.getUpId().toString() : null,
                filter.getDeptId() != null ? filter.getDeptId().toString() : null);

        filter.setEtats(buildEtatList(etatParam));

        List<Long> externeOnlyIds = formationRepository.findExterneOnlyIdsWithFilters(filter);
        List<Long> interneOnlyIds = formationRepository.findInterneOnlyIdsWithFilters(filter);
        List<Long> mixteIds = formationRepository.findMixteIdsWithFilters(filter);

        return new CountByTrainerTypeWithIdsDTO(
                (long) (externeOnlyIds == null ? 0 : externeOnlyIds.size()),
                (long) (interneOnlyIds == null ? 0 : interneOnlyIds.size()),
                (long) (mixteIds == null ? 0 : mixteIds.size()),
                externeOnlyIds, interneOnlyIds, mixteIds
        );
    }

    private void validateDates(Date start, Date end) {
        if (start != null && end != null && start.after(end)) {
            throw new IllegalArgumentException("La date de début doit être antérieure ou égale à la date de fin.");
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

    private EnseignantDTO mapEnseignantToDTO(Enseignant ens) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(ens.getId());
        dto.setNom(ens.getNom());
        dto.setPrenom(ens.getPrenom());
        dto.setMail(ens.getMail());
        dto.setType(ens.getType());
        if (ens.getDept() != null) {
            dto.setDeptId(ens.getDept().getId());
            dto.setDeptLibelle(ens.getDept().getLibelle());
        }
        if (ens.getUp() != null) {
            dto.setUpId(ens.getUp().getId());
            dto.setUpLibelle(ens.getUp().getLibelle());
        }
        return dto;
    }

    private List<EtatFormation> buildEtatList(String etatParam) {
        if (etatParam == null) {
            return List.of(EtatFormation.PLANIFIE, EtatFormation.ACHEVE);
        }
        String cle = etatParam.trim().toUpperCase();
        return switch (cle) {
            case "PLANIFIE" -> List.of(EtatFormation.PLANIFIE);
            case "ACHEVE" -> List.of(EtatFormation.ACHEVE);
            case "TOUT" -> Arrays.asList(EtatFormation.values());
            default -> throw new IllegalArgumentException("Paramètre etat invalide : '" + etatParam + "'. “PLANIFIE”, “ACHEVE” ou “TOUT” attendu.");
        };
    }
}
