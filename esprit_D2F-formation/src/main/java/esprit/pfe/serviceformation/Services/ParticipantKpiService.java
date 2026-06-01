package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.ParticipantKpiDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ParticipantKpiService {

    private final FormationRepository formationRepository;
    private final PresenceRepository presenceRepository;

    public Page<ParticipantKpiDTO> getParticipantKpis(Date startDate, Date endDate, Pageable pageable) {
        List<ParticipantKpiDTO> all = getParticipantKpis(startDate, endDate);
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size());
    }

    // KPIs par formation achevée pour une période donnée
    public List<ParticipantKpiDTO> getParticipantKpis(Date startDate, Date endDate) {
        // Récupérer toutes les formations achevées puis filtrer selon la période demandée sur la dateDebut
        List<Formation> formationsAchevees = formationRepository.findByEtatFormation(EtatFormation.ACHEVE)
                .stream()
                .filter(f -> !f.getDateDebut().before(startDate) && !f.getDateDebut().after(endDate))
                .toList();

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
                .toList();

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
