package tn.esprit.d2f.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;
import tn.esprit.d2f.entity.Competence;
import tn.esprit.d2f.entity.CompetenceAffectationDTO;
import tn.esprit.d2f.repository.CompetenceRepository;
@Slf4j
@Component
@RequiredArgsConstructor
public class AffectationConsumer {

    @Autowired
    CompetenceRepository competenceRepository;

    @JmsListener(destination = JmsConfig.AFFECT_QUEUE)
    public void receiveAffectation(CompetenceAffectationDTO dto) {
        System.out.println("📥 Nouveau message reçu : " + dto);
        Competence competence = competenceRepository.findById(dto.getCompetenceId()).orElse(null);
        if (competence != null) {
            if (dto.getDomaineId() != null) {
                competence.setDomaineId(dto.getDomaineId());
            }
            if (dto.getNiveauId() != null) {
                competence.setNiveauId(dto.getNiveauId());
            }
            if (dto.getSavoirIds() != null && !dto.getSavoirIds().isEmpty()) {
                competence.setSavoirIds(dto.getSavoirIds());
            }
            competenceRepository.save(competence);
            System.out.println(" Affectation reçue et appliquée: " + dto);
        }
    }
}

