package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Repositories.FormationRepository;
import esprit.pfe.serviceformation.Repositories.SeanceFormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.Map;

@Service
public class FormationStatistiquesService {

    @Autowired
    private FormationRepository formationRepository;

    @Autowired
    private SeanceFormationRepository seanceFormationRepository;


}
