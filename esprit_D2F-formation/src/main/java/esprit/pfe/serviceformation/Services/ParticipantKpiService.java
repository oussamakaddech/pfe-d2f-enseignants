package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.ParticipantKpiDTO;
import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import esprit.pfe.serviceformation.Repositories.PresenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParticipantKpiService {

    private final FormationRepository formationRepository;
    private final PresenceRepository presenceRepository;

    // KPIs par formation achevée pour une période donnée
    public List<ParticipantKpiDTO> getParticipantKpis(Date startDate, Date endDate) {
        // Récupérer toutes les formations achevées puis filtrer selon la période demandée sur la dateDebut
        List<Formation> formationsAchevees = formationRepository.findByEtatFormation(EtatFormation.ACHEVE)
                .stream()
                .filter(f -> !f.getDateDebut().before(startDate) && !f.getDateDebut().after(endDate))
                .collect(Collectors.toList());

        List<ParticipantKpiDTO> kpis = new ArrayList<>();

        // Parcourir uniquement les formations qui ont leur date de début dans la période
        for (Formation formation : formationsAchevees) {
            Long formationId = formation.getIdFormation();
            long totalParticipants = presenceRepository.countByFormationIdAndPeriod(formationId, startDate, endDate);
            long presentParticipants = presenceRepository.countPresentByFormationIdAndPeriod(formationId, startDate, endDate);
            double tauxParticipation = (totalParticipants > 0) ? ((double) presentParticipants / totalParticipants) * 100 : 0.0;

            ParticipantKpiDTO dto = new ParticipantKpiDTO();
            dto.setFormationId(formationId);
            dto.setTitreFormation(formation.getTitreFormation());
            dto.setNombreParticipantsTotal(totalParticipants);
            dto.setNombreParticipantsPresent(presentParticipants);
            dto.setTauxParticipation(tauxParticipation);

            kpis.add(dto);
        }
        return kpis;
    }

    // KPI global sur toutes les formations achevées pour une période donnée
    public ParticipantKpiDTO getGlobalParticipantKpi(Date startDate, Date endDate) {
        // Récupérer toutes les formations achevées puis filtrer selon la période demandée
        List<Formation> formationsAchevees = formationRepository.findByEtatFormation(EtatFormation.ACHEVE)
                .stream()
                .filter(f -> !f.getDateDebut().before(startDate) && !f.getDateDebut().after(endDate))
                .collect(Collectors.toList());

        long totalParticipantsGlobal = 0;
        long presentParticipantsGlobal = 0;

        for (Formation formation : formationsAchevees) {
            Long formationId = formation.getIdFormation();
            totalParticipantsGlobal += presenceRepository.countByFormationIdAndPeriod(formationId, startDate, endDate);
            presentParticipantsGlobal += presenceRepository.countPresentByFormationIdAndPeriod(formationId, startDate, endDate);
        }
        double tauxGlobal = (totalParticipantsGlobal > 0) ? ((double) presentParticipantsGlobal / totalParticipantsGlobal) * 100 : 0.0;

        ParticipantKpiDTO dto = new ParticipantKpiDTO();
        dto.setFormationId(null);
        dto.setTitreFormation("Global");
        dto.setNombreParticipantsTotal(totalParticipantsGlobal);
        dto.setNombreParticipantsPresent(presentParticipantsGlobal);
        dto.setTauxParticipation(tauxGlobal);
        return dto;
    }
}
