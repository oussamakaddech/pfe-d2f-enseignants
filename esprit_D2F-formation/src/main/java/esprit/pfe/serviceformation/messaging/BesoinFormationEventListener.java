package esprit.pfe.serviceformation.messaging;

import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.TypeFormation;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import esprit.pfe.serviceformation.Repositories.UpRepository;
import esprit.pfe.serviceformation.Repositories.DeptRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class BesoinFormationEventListener {
    @Autowired
     FormationRepository repo;
    @Autowired
     UpRepository upRepo;           // pour récupérer l’entité Up
    @Autowired
     DeptRepository deptRepo;       // pour récupérer l’entité Dept
    private static final String QUEUE = "BesoinFormationApprovedQueue";



    @JmsListener(destination = QUEUE, containerFactory = "jmsListenerContainerFactory")
    public void onBesoinApproved(BesoinFormationApprovedEvent evt) {
        // 1) Instanciation
        Formation f = new Formation();

        // 2) Mapping manuel DTO → Entité (attention aux noms de champs)
        f.setIdBesoinFormation(       evt.getIdBesoinFormation());
        f.setTitreFormation(          evt.getProgrammeFormation());            // titreFormation ← programmeFormation
        f.setDomaine(                 evt.getTheme());                        // domaine ← theme
        f.setPopulationCible(         evt.getPublicCible());                  // populationCible ← publicCible
        f.setObjectifs(               evt.getObjectifFormation());             // objectifs ← objectifFormation
        f.setObjectifsPedago(         evt.getObjectifsPedagogiques());        // objectifsPedago ← objectifsPedagogiques
        f.setEvalMethods(             evt.getMethodesEvaluationAcquis());      // evalMethods ← methodesEvaluationAcquis
        f.setPrerequis(               evt.getPrerequis());                    // prerequis ← prerequis
        f.setIndicateurs(             evt.getMoyensPedagogiques());           // indicateurs ← moyensPedagogiques
        f.setChargeHoraireGlobal(     evt.getDureeFormation());               // chargeHoraireGlobal ← dureeFormation

        // Si vous avez un enum TypeFormation qui correspond à typeBesoin
        f.setTypeBesoin(evt.getTypeBesoin());

        // 3) Liens JPA vers Up et Dept (à adapter selon vos méthodes de recherche)
        upRepo.findById(evt.getUp())
                .ifPresent(f::setUp);

        deptRepo.findById(evt.getDepartement())
                .ifPresent(f::setDepartement);

        // 4) Initialisation métier
        f.setTypeFormation(TypeFormation.INTERNE);
        f.setEtatFormation(EtatFormation.NOUVEAU);
        f.setDateDebut(new Date());
        f.setDateFin(  new Date()); // ou une date calculée

        // 5) Sauvegarde
        repo.save(f);
    }
}
