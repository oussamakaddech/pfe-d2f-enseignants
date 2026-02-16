package tn.esprit.d2f.service;

import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.entity.Competence;
import tn.esprit.d2f.entity.UserCompetence;
import tn.esprit.d2f.repository.CompetenceRepository;
import tn.esprit.d2f.repository.UserCompetenceRepository;

import java.util.List;

@Service
@AllArgsConstructor
public class UserCompetenceService {

    @Autowired
    UserCompetenceRepository userCompetenceRepository;
    @Autowired
    CompetenceRepository competenceRepository;

    public UserCompetence addCompetenceToUser(String userId, Long competenceId) {
        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new RuntimeException("Compétence non trouvée"));

        UserCompetence userCompetence = new UserCompetence();
        userCompetence.setUserId(userId);
        userCompetence.setCompetence(competence);

        return userCompetenceRepository.save(userCompetence);
    }

    public List<UserCompetence> getUserCompetences(String userId) {
        return userCompetenceRepository.findByUserId(userId);
    }
}
